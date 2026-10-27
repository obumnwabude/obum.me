import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { THEME_ICONS, THEME_MODES, type ThemeMode, ThemeService } from '../core/theme.service';

@Component({
  selector: 'obum-theme-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatMenuModule, MatTooltipModule],
  template: `
    <button
      class="glass-icon-button"
      type="button"
      [matMenuTriggerFor]="menu"
      [attr.aria-label]="'Theme: ' + theme.mode()"
      matTooltip="Theme"
    >
      <mat-icon>{{ theme.isDark() ? 'dark_mode' : 'light_mode' }}</mat-icon>
    </button>
    <mat-menu #menu="matMenu" xPosition="before" class="glass-menu choice-menu">
      <p class="menu-heading">Appearance</p>
      @for (mode of modes; track mode) {
        <button
          mat-menu-item
          type="button"
          role="menuitemradio"
          [attr.aria-checked]="theme.mode() === mode"
          [class.is-active]="theme.mode() === mode"
          (click)="choose(mode, $event)"
        >
          <mat-icon>{{ icons[mode] }}</mat-icon>
          <span class="choice-label">{{ mode }}</span>
          <span class="choice-mark trailing" [class.on]="theme.mode() === mode" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M4 8.5l2.6 2.6L12 5.6" /></svg></span>
        </button>
      }
    </mat-menu>
  `,
})
export class ThemeMenu {
  protected readonly theme = inject(ThemeService);
  protected readonly modes = THEME_MODES;
  protected readonly icons = THEME_ICONS;

  protected choose(mode: ThemeMode, event: MouseEvent): void {
    this.theme.set(mode, event);
  }
}
