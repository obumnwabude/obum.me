import { Component, HostBinding, OnInit } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { constants } from './constants';
import { ThemingService } from './theming.service';

@Component({
  selector: 'obum-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  themes = constants.THEMES;
  @HostBinding('class') public themeMode = constants.DEFAULT_THEME;
  constructor(
    private overlay: OverlayContainer,
    public theming: ThemingService
  ) {}

  ngOnInit(): void {
    this.theming.theme.subscribe((theme: string) => {
      this.themeMode = theme;
      const oCClasses = this.overlay.getContainerElement().classList;
      oCClasses.remove(...Array.from(this.themes));
      oCClasses.add(this.themeMode);
    });
  }

  changeTheme(): void {
    this.themeMode =
      this.themes.indexOf(this.themeMode) == 0
        ? this.themes[1]
        : this.themes[0];
    this.theming.theme.next(this.themeMode);
    localStorage.setItem(constants.LS_THEME_KEY, this.themeMode);
  }

  newLink(): void {}
}
