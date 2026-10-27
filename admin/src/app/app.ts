import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, DOCUMENT, computed, effect, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from './core/auth.service';
import { PanelService } from './core/panel.service';
import { LinksView } from './links/links-view';
import { LinkPanel } from './panel/link-panel';
import { ThemeMenu } from './shared/theme-menu';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

@Component({
  selector: 'obum-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, MatIconModule, MatMenuModule, MatTooltipModule, LinksView, LinkPanel, ThemeMenu],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '(document:keydown)': 'onKeydown($event)',
    '(window:scroll)': 'onScroll()',
  },
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly panel = inject(PanelService);
  private readonly dialog = inject(MatDialog);
  private readonly document = inject(DOCUMENT);

  private paletteOpen = false;

  protected readonly panelOpen = computed(() => this.panel.state().mode !== 'closed');
  protected readonly isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  protected readonly scrolled = signal(false);
  protected readonly progress = signal(0);
  /** The sign-in button only shows on admin.obum.me/auth; visitors never see it. */
  protected readonly onAuthPage = signal(/^\/(auth|signin)\/?$/.test(location.pathname));

  constructor() {
    // Keep the page still behind the open panel.
    effect(() => this.document.documentElement.classList.toggle('panel-open', this.panelOpen()));
    // Once signed in on /auth, go back to the plain address.
    effect(() => {
      if (this.onAuthPage() && this.auth.user()) {
        history.replaceState(null, '', '/');
        this.onAuthPage.set(false);
      }
    });
    this.onScroll();
  }

  protected onScroll(): void {
    const root = this.document.documentElement;
    const max = root.scrollHeight - window.innerHeight;
    this.scrolled.set(window.scrollY > 8);
    this.progress.set(max > 0 ? Math.min(1, window.scrollY / max) : 0);
  }

  protected async openPalette(): Promise<void> {
    if (this.paletteOpen) return;
    this.paletteOpen = true;
    const { CommandPalette } = await import('./shared/command-palette');
    this.dialog
      .open(CommandPalette, {
        panelClass: 'palette-panel',
        backdropClass: 'palette-backdrop',
        position: { top: 'min(12vh, 96px)' },
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'input',
      })
      .afterClosed()
      .subscribe(() => (this.paletteOpen = false));
  }

  protected onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      void this.openPalette();
      return;
    }
    if (event.key === 'Escape' && this.panelOpen() && !this.dialog.openDialogs.length) {
      this.panel.close();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target) || this.dialog.openDialogs.length) return;
    if (event.key === '/') {
      event.preventDefault();
      void this.openPalette();
    } else if (event.key.toLowerCase() === 'n' && this.auth.isAdmin() && !this.panelOpen()) {
      event.preventDefault();
      this.panel.openNew();
    }
  }
}
