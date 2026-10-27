import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChildren } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../core/auth.service';
import { SHORT_HOST } from '../core/firebase';
import { LinkActions } from '../core/link-actions.service';
import { LinksService } from '../core/links.service';
import { PanelService } from '../core/panel.service';
import { THEME_ICONS, THEME_MODES, ThemeService } from '../core/theme.service';
import { destinationOf, faviconUrl } from './destination';

interface Command {
  id: string;
  group: 'Actions' | 'Links' | 'Theme';
  icon?: string;
  favicon?: string;
  label: string;
  slug?: string;
  detail?: string;
  keywords?: string;
  active?: boolean;
  run: () => void;
}

const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

@Component({
  selector: 'obum-command-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="search-row">
      <mat-icon aria-hidden="true">search</mat-icon>
      <input
        #input
        placeholder="Search links, or type a command"
        aria-label="Search links and actions"
        role="combobox"
        aria-expanded="true"
        aria-controls="palette-results"
        [attr.aria-activedescendant]="flat()[active()]?.id"
        [value]="query()"
        (input)="query.set(input.value); active.set(0)"
        (keydown.arrowdown)="move(1, $event)"
        (keydown.arrowup)="move(-1, $event)"
        (keydown.enter)="runActive()"
      />
      @if (query()) {
        <button class="clear" type="button" aria-label="Clear search" (click)="query.set(''); input.focus()">
          <mat-icon>close</mat-icon>
        </button>
      }
      <button class="esc" type="button" (click)="close()">esc</button>
    </div>

    <div class="results" id="palette-results" role="listbox" aria-label="Results">
      @for (group of groups(); track group.name) {
        <div class="group" role="group" [attr.aria-label]="group.name">
          <p class="group-heading">{{ group.name }} <span>{{ group.items.length }}</span></p>
          @for (item of group.items; track item.id) {
            <div
              #option
              class="item"
              role="option"
              [id]="item.id"
              [attr.aria-selected]="item.id === flat()[active()]?.id"
              [class.active]="item.id === flat()[active()]?.id"
              (mousemove)="hover(item)"
              (click)="run(item)"
            >
              @if (item.favicon) {
                <span class="favicon-tile"><img [src]="item.favicon" alt="" width="14" height="14" (error)="hideImage($event)" /></span>
              } @else {
                <mat-icon class="icon">{{ item.icon }}</mat-icon>
              }
              <span class="content">
                @if (item.slug !== undefined) {
                  <span class="label slug"><span class="host">{{ host }}/</span>{{ item.slug || '(home)' }}</span>
                } @else {
                  <span class="label">{{ item.label }}</span>
                }
                @if (item.detail) {
                  <span class="detail">{{ item.detail }}</span>
                }
              </span>
              @if (item.active) {
                <mat-icon class="check" aria-label="Current">check</mat-icon>
              }
            </div>
          }
        </div>
      } @empty {
        <div class="empty">
          <mat-icon>search_off</mat-icon>
          <p>Nothing matches “{{ query() }}”.</p>
          <span>Try part of a short name, a site like “github”, or “theme”.</span>
        </div>
      }
    </div>

    <footer class="footer">
      <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
      <span><kbd>↵</kbd> open</span>
      <span class="hide-small"><kbd>{{ modKey }}</kbd><kbd>K</kbd> toggle</span>
      <span class="count">{{ flat().length }} {{ flat().length === 1 ? 'result' : 'results' }}</span>
    </footer>
  `,
  styles: `
    :host { display: flex; flex-direction: column; max-height: min(72vh, 620px); }

    .search-row {
      display: flex; align-items: center; gap: 12px; padding: 16px 18px;
      border-bottom: 1px solid var(--glass-border);
      > mat-icon { color: var(--gray); }
      input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text); font: inherit; font-size: 17px; }
      input::placeholder { color: var(--gray); opacity: 0.8; }
    }
    .clear {
      display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 50%;
      background: rgb(from var(--text) r g b / 7%); color: var(--gray); cursor: pointer;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .esc {
      padding: 3px 8px; border: 1px solid var(--glass-border); border-radius: 6px; background: rgb(from var(--text) r g b / 4%);
      color: var(--gray); font: 500 12px/1.2 Inter, system-ui, sans-serif; cursor: pointer;
    }

    .results { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 6px 0 10px; }
    .group-heading {
      display: flex; align-items: center; gap: 8px; margin: 0; padding: 12px 20px 6px;
      color: var(--gray); font-size: 12px; font-weight: 600;
      span { padding: 1px 7px; border-radius: 999px; background: rgb(from var(--text) r g b / 6%); font-size: 11px; font-weight: 600; }
    }
    .item {
      display: flex; align-items: center; gap: 14px; padding: 10px 20px 10px 18px; cursor: pointer;
      border-left: 2px solid transparent;
      &.active { background: rgb(from var(--primary) r g b / 8%); border-left-color: var(--primary); }
      &.active .icon { color: var(--primary); }
    }
    .icon { flex: none; color: var(--gray); font-size: 20px; width: 20px; height: 20px; }
    .content { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .label { font-size: 14.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .slug { font-weight: 600; .host { color: var(--gray); font-weight: 400; } }
    .detail { color: var(--gray); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .check { flex: none; color: var(--primary); font-size: 20px; width: 20px; height: 20px; }

    .empty {
      display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 40px 24px; text-align: center; color: var(--gray);
      mat-icon { font-size: 30px; width: 30px; height: 30px; opacity: 0.5; }
      p { margin: 4px 0 0; color: var(--text); }
      span { font-size: 13px; }
    }

    .footer {
      display: flex; align-items: center; gap: 18px; padding: 10px 18px; border-top: 1px solid var(--glass-border);
      color: var(--gray); font-size: 12px;
      span { display: inline-flex; align-items: center; gap: 4px; }
      kbd { min-width: 20px; height: 20px; font-size: 11px; }
      .count { margin-left: auto; }
    }
    @media (max-width: 520px) { .hide-small { display: none !important; } }
  `,
})
export class CommandPalette {
  private readonly ref = inject(MatDialogRef<CommandPalette>);
  private readonly auth = inject(AuthService);
  private readonly links = inject(LinksService);
  private readonly panel = inject(PanelService);
  private readonly theme = inject(ThemeService);
  private readonly actions = inject(LinkActions);
  private readonly options = viewChildren<ElementRef<HTMLElement>>('option');

  protected readonly host = SHORT_HOST;
  protected readonly modKey = isMac ? '⌘' : 'Ctrl';
  protected readonly query = signal('');
  protected readonly active = signal(0);

  private readonly commands = computed<Command[]>(() => {
    const admin = this.auth.isAdmin();
    const list: Command[] = [];
    if (admin) list.push({ id: 'cmd-new', group: 'Actions', icon: 'add_link', label: 'Create a new short link', keywords: 'add new', run: () => this.panel.openNew() });
    list.push(
      admin
        ? { id: 'cmd-signout', group: 'Actions', icon: 'logout', label: 'Sign out', run: () => void this.auth.signOut() }
        : { id: 'cmd-signin', group: 'Actions', icon: 'login', label: 'Sign in with Google', keywords: 'login admin', run: () => void this.auth.signIn() },
    );
    for (const link of this.links.links()) {
      const destination = destinationOf(link.long);
      list.push({
        id: `link-${link.id}`,
        group: 'Links',
        favicon: faviconUrl(destination.host),
        label: link.short,
        slug: link.short,
        detail: `${destination.host}${destination.rest}`,
        keywords: `${destination.label} ${link.tags.join(' ')}`,
        run: () => this.panel.openLink(link.id),
      });
    }
    for (const mode of THEME_MODES) {
      list.push({
        id: `theme-${mode.replace(/\s/g, '-')}`,
        group: 'Theme',
        icon: THEME_ICONS[mode],
        label: mode,
        keywords: 'theme appearance dark light device',
        active: this.theme.mode() === mode,
        run: () => this.theme.set(mode),
      });
    }
    return list;
  });

  protected readonly groups = computed(() => {
    const terms = this.query().toLowerCase().split(/\s+/).filter(Boolean);
    const matches = this.commands().filter((command) => {
      if (!terms.length) return true;
      const haystack = `${command.label} ${command.detail ?? ''} ${command.keywords ?? ''} ${command.group}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
    const order: Command['group'][] = terms.length ? ['Links', 'Actions', 'Theme'] : ['Actions', 'Links', 'Theme'];
    return order
      .map((name) => ({ name, items: matches.filter((command) => command.group === name).slice(0, name === 'Links' ? 30 : 10) }))
      .filter((group) => group.items.length);
  });

  protected readonly flat = computed(() => this.groups().flatMap((group) => group.items));

  constructor() {
    // Keep the highlighted row in view while moving with the keyboard.
    effect(() => {
      const index = this.active();
      this.options()[index]?.nativeElement.scrollIntoView({ block: 'nearest' });
    });
  }

  protected hover(item: Command): void {
    const index = this.flat().indexOf(item);
    if (index >= 0 && index !== this.active()) this.active.set(index);
  }

  protected move(step: number, event: Event): void {
    event.preventDefault();
    const count = this.flat().length;
    if (count) this.active.set((this.active() + step + count) % count);
  }

  protected runActive(): void {
    const command = this.flat()[this.active()];
    if (command) this.run(command);
  }

  protected run(command: Command): void {
    this.ref.close();
    command.run();
  }

  protected close(): void {
    this.ref.close();
  }

  protected hideImage(event: Event): void {
    (event.target as HTMLElement).parentElement?.classList.add('missing');
  }
}
