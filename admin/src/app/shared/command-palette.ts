import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../core/auth.service';
import { SHORT_HOST } from '../core/firebase';
import { LinkActions } from '../core/link-actions.service';
import { LinksService } from '../core/links.service';
import { PanelService } from '../core/panel.service';
import { THEME_ICONS, THEME_MODES, ThemeService } from '../core/theme.service';
import { destinationOf } from './destination';

interface Command {
  id: string;
  icon: string;
  label: string;
  detail?: string;
  slug?: string;
  keywords?: string;
  run: () => void;
}

@Component({
  selector: 'obum-command-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <label class="palette-search">
      <mat-icon aria-hidden="true">search</mat-icon>
      <input
        #input
        cdkFocusInitial
        placeholder="Jump to a link or run an action"
        aria-label="Search links and actions"
        role="combobox"
        aria-controls="palette-results"
        [attr.aria-activedescendant]="results()[active()]?.id"
        [value]="query()"
        (input)="query.set(input.value); active.set(0)"
        (keydown.arrowdown)="move(1, $event)"
        (keydown.arrowup)="move(-1, $event)"
        (keydown.enter)="runActive()"
      />
      <kbd>esc</kbd>
    </label>
    <ul id="palette-results" role="listbox">
      @for (command of results(); track command.id; let index = $index) {
        <li
          role="option"
          [id]="command.id"
          [attr.aria-selected]="index === active()"
          [class.active]="index === active()"
          (mousemove)="active.set(index)"
          (click)="run(command)"
        >
          <mat-icon>{{ command.icon }}</mat-icon>
          @if (command.slug !== undefined) {
            <span class="slug"><span class="host">{{ host }}/</span>{{ command.slug }}</span>
          } @else {
            <span>{{ command.label }}</span>
          }
          @if (command.detail) {
            <span class="detail">{{ command.detail }}</span>
          }
        </li>
      } @empty {
        <li class="none">Nothing matches “{{ query() }}”.</li>
      }
    </ul>
  `,
  styles: `
    :host { display: block; width: min(620px, 92vw); }
    .palette-search {
      display: flex; align-items: center; gap: 10px; padding: 14px 18px;
      border-bottom: 1px solid var(--glass-border);
      mat-icon { color: var(--gray); }
      input { flex: 1; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; font-size: 17px; }
    }
    ul { list-style: none; margin: 0; padding: 8px; max-height: min(420px, 60vh); overflow-y: auto; }
    li {
      display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; cursor: pointer; overflow: hidden;
      mat-icon { color: var(--gray); flex: none; }
      &.active { background: rgb(from var(--primary) r g b / 10%); mat-icon { color: var(--primary); } }
      &.none { color: var(--gray); cursor: default; }
    }
    .slug { font-weight: 600; white-space: nowrap; .host { color: var(--gray); font-weight: 400; } }
    .detail { flex: 1 1 0; margin-left: auto; color: var(--gray); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; text-align: right; }
  `,
})
export class CommandPalette {
  private readonly ref = inject(MatDialogRef<CommandPalette>);
  private readonly auth = inject(AuthService);
  private readonly links = inject(LinksService);
  private readonly panel = inject(PanelService);
  private readonly theme = inject(ThemeService);
  private readonly actions = inject(LinkActions);

  protected readonly host = SHORT_HOST;
  protected readonly query = signal('');
  protected readonly active = signal(0);

  private readonly commands = computed<Command[]>(() => {
    const admin = this.auth.isAdmin();
    const base: Command[] = [];
    if (admin) base.push({ id: 'cmd-new', icon: 'add_link', label: 'New short link', run: () => this.panel.openNew() });
    for (const mode of THEME_MODES) {
      base.push({ id: `cmd-theme-${mode}`, icon: THEME_ICONS[mode], label: `Switch to ${mode}`, run: () => this.theme.set(mode) });
    }
    base.push(
      admin
        ? { id: 'cmd-signout', icon: 'logout', label: 'Sign out', run: () => void this.auth.signOut() }
        : { id: 'cmd-signin', icon: 'login', label: 'Sign in with Google', run: () => void this.auth.signIn() },
    );
    const links = this.links.links().flatMap<Command>((link) => [
      {
        id: `open-${link.id}`,
        icon: 'link',
        label: link.short,
        slug: link.short,
        detail: link.long,
        keywords: `${destinationOf(link.long).label} ${link.tags.join(' ')}`,
        run: () => this.panel.openLink(link.id),
      },
      { id: `copy-${link.id}`, icon: 'content_copy', label: `Copy ${link.short}`, detail: `Copy ${SHORT_HOST}/${link.short}`, run: () => void this.actions.copy(link.short) },
    ]);
    return [...base, ...links];
  });

  protected readonly results = computed(() => {
    const terms = this.query().toLowerCase().split(/\s+/).filter(Boolean);
    const matches = this.commands().filter((command) => {
      if (!terms.length) return !command.id.startsWith('copy-');
      const haystack = `${command.label} ${command.detail ?? ''} ${command.keywords ?? ''}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
    return matches.slice(0, 40);
  });

  protected move(step: number, event: Event): void {
    event.preventDefault();
    const count = this.results().length;
    if (count) this.active.set((this.active() + step + count) % count);
  }

  protected runActive(): void {
    const command = this.results()[this.active()];
    if (command) this.run(command);
  }

  protected run(command: Command): void {
    this.ref.close();
    command.run();
  }
}
