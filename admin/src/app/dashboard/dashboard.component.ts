import { Component, OnDestroy } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  MatBottomSheet,
  MatBottomSheetRef
} from '@angular/material/bottom-sheet';
import { firstValueFrom } from 'rxjs';

import { EditorComponent } from '../editor/editor.component';
import { EditorService } from '../editor.service';
import { Link } from '../link';

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
    private editorService: EditorService
  ) {}

  ngOnDestroy = () => this.breakpointSub.unsubscribe();

  openEditor(link: Link | null) {
    this.editorService.currentLink = link;

    if (this.isLargeScreen) {
      this.editorService.sidenav.open();
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
