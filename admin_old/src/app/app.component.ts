import {
  AfterViewInit,
  Component,
  HostBinding,
  OnInit,
  ViewChild
} from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MatSidenav } from '@angular/material/sidenav';
import { SPINNER } from 'ngx-ui-loader';

import { constants } from './constants';
import { EditorService } from './editor.service';
import { ThemingService } from './theming.service';

@Component({
  selector: 'obum-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit, OnInit {
  // the 500 level of mat light blue palette
  primaryColor = '#03A9F4';
  SPINNER = SPINNER;
  themes = constants.THEMES;
  @ViewChild('snav') snav!: MatSidenav;
  @HostBinding('class') public themeMode = constants.DEFAULT_THEME;

  constructor(
    private overlay: OverlayContainer,
    private editorService: EditorService,
    public theming: ThemingService
  ) {}

  ngAfterViewInit(): void {
    this.editorService.sidenav = this.snav;
  }

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
}
