import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  MatBottomSheet,
  MatBottomSheetRef
} from '@angular/material/bottom-sheet';
import { MatSidenav } from '@angular/material/sidenav';
import { firstValueFrom } from 'rxjs';

import { EditorComponent } from '../editor/editor.component';
import { SidenavService } from '../sidenav.service';

@Component({
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnDestroy {
  bsRef!: MatBottomSheetRef<EditorComponent>;
  isLargeScreen = false;
  breakpointSub = this.breakpoint
    .observe('(min-width: 768px)')
    .subscribe((b) => (this.isLargeScreen = b.matches));

  constructor(
    private breakpoint: BreakpointObserver,
    private bs: MatBottomSheet,
    private sidenav: SidenavService
  ) {}

  ngOnDestroy = () => this.breakpointSub.unsubscribe();

  newLink(): void {
    if (this.isLargeScreen) {
      this.sidenav.component.open();
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
