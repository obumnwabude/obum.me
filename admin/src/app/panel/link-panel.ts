import { ChangeDetectionStrategy, Component, computed, effect, inject, resource, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { type AbstractControl, FormControl, FormGroup, ReactiveFormsModule, type ValidationErrors, Validators } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { type MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ApiService, type Breakdown } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { SHORT_HOST } from '../core/firebase';
import { LinkActions } from '../core/link-actions.service';
import { type Link, type LinkInput, LinksService } from '../core/links.service';
import { PanelService } from '../core/panel.service';
import { BarChart } from '../shared/bar-chart';
import { destinationOf, faviconUrl, suggestShort } from '../shared/destination';
import { DEVICE_LABELS, compactNumber, countryLabel, timeAgo } from '../shared/format';

const DRAFT_KEY = 'link.draft';
const SHORT_PATTERN = /^[A-Za-z0-9-][\w-]*$/;

function readDraft(): Partial<LinkInput> {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as Partial<LinkInput>;
  } catch {
    return {};
  }
}

@Component({
  selector: 'obum-link-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ReactiveFormsModule,
    BarChart,
  ],
  templateUrl: './link-panel.html',
  styleUrl: './link-panel.scss',
})
export class LinkPanel {
  protected readonly panel = inject(PanelService);
  protected readonly auth = inject(AuthService);
  protected readonly linksService = inject(LinksService);
  protected readonly actions = inject(LinkActions);
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly host = SHORT_HOST;
  protected readonly compact = compactNumber;
  protected readonly timeAgo = timeAgo;
  protected readonly countryLabel = countryLabel;
  protected readonly deviceLabels = DEVICE_LABELS;
  protected readonly separatorKeys = [ENTER, COMMA] as const;

  /** The link being viewed or edited (undefined for a new link, or while it loads). */
  protected readonly link = computed<Link | undefined>(() => {
    const state = this.panel.state();
    return state.mode === 'link' ? this.linksService.byId(state.id) : undefined;
  });
  protected readonly isNew = computed(() => this.panel.state().mode === 'new');
  protected readonly editing = computed(() => {
    const state = this.panel.state();
    return this.auth.isAdmin() && (state.mode === 'new' || (state.mode === 'link' && state.edit));
  });
  protected readonly destination = computed(() => {
    const link = this.link();
    if (!link) return null;
    const destination = destinationOf(link.long);
    return { ...destination, favicon: faviconUrl(destination.host) };
  });

  protected readonly saving = signal(false);
  protected readonly tags = signal<string[]>([]);
  private shortTouchedByUser = false;

  protected readonly form = new FormGroup({
    long: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^https:\/\/\S+\.\S+/)] }),
    short: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(SHORT_PATTERN), Validators.maxLength(80), (control) => this.takenValidator(control)],
    }),
  });

  /** Analytics for the open link (admin only). */
  protected readonly days = signal(30);
  protected readonly stats = resource({
    params: () => {
      const link = this.link();
      return link && this.auth.isAdmin() && !this.editing() ? { short: link.short, days: this.days() } : undefined;
    },
    loader: ({ params }) => this.api.stats(params.short, params.days),
  });

  constructor() {
    // Reset the form only when the panel switches to another link, to "new", or into/out of editing,
    // not when live click counts update the open link.
    const formKey = computed(() => {
      const state = this.panel.state();
      const loaded = state.mode === 'link' ? Boolean(this.linksService.byId(state.id)) : true;
      return state.mode === 'link' ? `link:${state.id}:${state.edit}:${loaded}` : state.mode === 'new' ? `new:${state.short ?? ''}:${state.long ?? ''}` : 'closed';
    });
    effect(() => {
      formKey();
      untracked(() => {
        const state = this.panel.state();
        this.resetForm(state.mode === 'new' ? state : undefined, this.link());
      });
    });

    this.form.controls.long.valueChanges.subscribe((long) => {
      if (this.isNew() && !this.shortTouchedByUser) {
        const suggestion = suggestShort(long);
        if (suggestion) this.form.controls.short.setValue(suggestion, { emitEvent: false });
        this.form.controls.short.updateValueAndValidity();
      }
      this.saveDraft();
    });
    this.form.controls.short.valueChanges.subscribe(() => this.saveDraft());
  }

  protected conflictFor(short: string): Link | undefined {
    return this.linksService.conflict(short, this.link()?.id);
  }

  protected onShortInput(): void {
    this.shortTouchedByUser = true;
  }

  protected suggest(): void {
    const suggestion = suggestShort(this.form.controls.long.value);
    if (suggestion) {
      this.form.controls.short.setValue(suggestion);
      this.form.controls.short.markAsTouched();
    }
  }

  protected addTag(event: MatChipInputEvent): void {
    const value = event.value.trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '-');
    if (value && !this.tags().includes(value)) this.tags.update((tags) => [...tags, value]);
    event.chipInput.clear();
    this.saveDraft();
  }

  protected removeTag(tag: string): void {
    this.tags.update((tags) => tags.filter((existing) => existing !== tag));
    this.saveDraft();
  }

  protected edit(): void {
    const link = this.link();
    if (link) this.panel.openLink(link.id, true);
  }

  protected cancel(): void {
    const link = this.link();
    if (link) this.panel.openLink(link.id, false);
    else this.panel.close();
  }

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    const input: LinkInput = { long: this.form.controls.long.value.trim(), short: this.form.controls.short.value.trim(), tags: this.tags() };
    const existing = this.link();
    this.saving.set(true);
    try {
      if (existing) {
        await this.linksService.update(existing, input);
        void this.api.purge([existing.short, input.short]);
        this.snackBar.open(`Saved ${this.host}/${input.short}`);
        this.panel.openLink(existing.id, false);
      } else {
        const id = await this.linksService.create(input);
        void this.api.purge([input.short]);
        this.clearDraft();
        this.snackBar
          .open(`Created ${this.host}/${input.short}`, 'Copy', { duration: 6000 })
          .onAction()
          .subscribe(() => void this.actions.copy(input.short));
        this.panel.openLink(id, false);
      }
    } catch (error) {
      this.snackBar.open(error instanceof Error ? error.message : 'Saving failed. Try again.', 'Dismiss');
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const link = this.link();
    if (!link || this.saving()) return;
    this.saving.set(true);
    try {
      const undo = await this.linksService.remove(link);
      void this.api.purge([link.short]);
      this.panel.close();
      this.snackBar
        .open(`Deleted ${this.host}/${link.short}`, 'Undo', { duration: 8000 })
        .onAction()
        .subscribe(async () => {
          await undo();
          void this.api.purge([link.short]);
          this.snackBar.open(`Restored ${this.host}/${link.short}`);
        });
    } catch (error) {
      this.snackBar.open(error instanceof Error ? error.message : 'Deleting failed. Try again.', 'Dismiss');
    } finally {
      this.saving.set(false);
    }
  }

  protected share(rows: Breakdown[]): { name: string; clicks: number; percent: number }[] {
    const total = rows.reduce((sum, row) => sum + row.clicks, 0) || 1;
    return rows.map((row) => ({ ...row, percent: Math.round((row.clicks / total) * 100) }));
  }

  protected statsTotal(): number {
    return this.stats.value()?.daily.reduce((sum, day) => sum + day.clicks, 0) ?? 0;
  }

  private takenValidator(control: AbstractControl<string>): ValidationErrors | null {
    const value = (control.value ?? '').trim();
    if (!value) return null;
    if (value.startsWith('_')) return { reserved: true };
    const conflict = this.linksService.conflict(value, this.link()?.id);
    return conflict ? { taken: conflict.long } : null;
  }

  private resetForm(prefill: { short?: string; long?: string } | undefined, link: Link | undefined): void {
    const draft = prefill && !prefill.short && !prefill.long ? readDraft() : {};
    const long = prefill?.long ?? link?.long ?? draft.long ?? '';
    const short = prefill?.short ?? link?.short ?? draft.short ?? '';
    this.form.reset({ long, short }, { emitEvent: false });
    this.tags.set(link?.tags ?? draft.tags ?? []);
    this.shortTouchedByUser = Boolean(short);
  }

  private saveDraft(): void {
    if (!this.isNew()) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...this.form.getRawValue(), tags: this.tags() }));
    } catch {
      /* ignore */
    }
  }

  private clearDraft(): void {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }
}
