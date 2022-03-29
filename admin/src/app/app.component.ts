import { Component, HostBinding, OnInit, ViewChild } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import {
  MatBottomSheet,
  MatBottomSheetRef
} from '@angular/material/bottom-sheet';
import { MatSidenav } from '@angular/material/sidenav';

import { constants } from './constants';
import { EditorComponent } from './editor/editor.component';
import { ThemingService } from './theming.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'obum-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  bsRef!: MatBottomSheetRef<EditorComponent>;
  isLargeScreen = false;
  themes = constants.THEMES;
  @ViewChild('snav') snav!: MatSidenav;
  @HostBinding('class') public themeMode = constants.DEFAULT_THEME;
  constructor(
    private breakpoint: BreakpointObserver,
    private bs: MatBottomSheet,
    private overlay: OverlayContainer,
    public theming: ThemingService
  ) {}

  ngOnInit(): void {
    this.breakpoint.observe('(min-width: 768px)').subscribe((b) => {
      if (b.matches) {
        this.isLargeScreen = true;
        this.bsRef?.dismiss();
      } else {
        this.isLargeScreen = false;
        this.snav?.close();
      }
    });

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

  newLink(): void {
    if (this.isLargeScreen) {
      this.snav.open();
    } else {
      this.bsRef = this.bs.open(EditorComponent);
      const closeSub = this.bsRef.instance.cancel.subscribe((_) =>
        this.bsRef.dismiss()
      );
      firstValueFrom(this.bsRef.afterDismissed()).then(() =>
        closeSub.unsubscribe()
      );
    }
  }
}
