import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatBottomSheet, type MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { map } from 'rxjs';

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
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatSidenavModule, MatTooltipModule, LinksView, LinkPanel, ThemeMenu],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly panel = inject(PanelService);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly dialog = inject(MatDialog);

  private readonly linksView = viewChild(LinksView);
  private sheetRef: MatBottomSheetRef<LinkPanel> | null = null;

  protected readonly wide = toSignal(
    inject(BreakpointObserver)
      .observe('(min-width: 900px)')
      .pipe(map((state) => state.matches)),
    { initialValue: window.matchMedia('(min-width: 900px)').matches },
  );
  protected readonly panelOpen = computed(() => this.panel.state().mode !== 'closed');
  protected readonly isMac = /Mac|iPhone|iPad/.test(navigator.platform);

  constructor() {
    // Phones get the panel as a bottom sheet; wide screens get a side drawer (see app.html).
    effect(() => {
      const open = this.panelOpen();
      const wide = this.wide();
      untracked(() => {
        if (open && !wide && !this.sheetRef) {
          this.sheetRef = this.bottomSheet.open(LinkPanel, { panelClass: 'glass-sheet', autoFocus: 'first-tabbable' });
          this.sheetRef.afterDismissed().subscribe(() => {
            this.sheetRef = null;
            if (!this.wide()) this.panel.close();
          });
        } else if ((!open || wide) && this.sheetRef) {
          this.sheetRef.dismiss();
        }
      });
    });
  }

  private paletteOpen = false;

  protected async openPalette(): Promise<void> {
    if (this.paletteOpen) return;
    this.paletteOpen = true;
    const { CommandPalette } = await import('./shared/command-palette');
    this.dialog
      .open(CommandPalette, { panelClass: ['glass-dialog', 'palette-dialog'], position: { top: '12vh' }, autoFocus: 'input' })
      .afterClosed()
      .subscribe(() => (this.paletteOpen = false));
  }

  protected onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      void this.openPalette();
      return;
    }
    if (event.key === 'Escape' && this.panelOpen() && this.wide() && !this.dialog.openDialogs.length) {
      this.panel.close();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target) || this.dialog.openDialogs.length) return;
    if (event.key === '/') {
      event.preventDefault();
      this.linksView()?.focusSearch();
    } else if (event.key.toLowerCase() === 'n' && this.auth.isAdmin() && !this.panelOpen()) {
      event.preventDefault();
      this.panel.openNew();
    }
  }
}
