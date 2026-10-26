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
    <mat-menu #menu="matMenu" xPosition="before" class="glass-menu">
      @for (mode of modes; track mode) {
        <button mat-menu-item type="button" (click)="choose(mode, $event)" [class.is-active]="theme.mode() === mode">
          <mat-icon>{{ icons[mode] }}</mat-icon>
          <span>{{ mode }}</span>
          @if (theme.mode() === mode) {
            <mat-icon class="check" aria-label="Selected">check</mat-icon>
          }
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
