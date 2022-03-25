import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent {
  short = new FormControl('', [
    Validators.pattern(/^(\w|\-)*$/),
    Validators.required
  ]);
  long = new FormControl('', [
    Validators.pattern(/^https:\/\//),
    Validators.required
  ]);
  link = new FormGroup({ short: this.short, long: this.long });

  constructor(
    public bsRef: MatBottomSheetRef<EditorComponent>,
    private snackBar: MatSnackBar
  ) {}

  saveLink(): void {
    if (this.link.invalid) {
      this.snackBar.open('Please resolve all errors', '', {
        panelClass: ['snackbar-error']
      });
    } else {
      console.log(this.link.value);
      this.snackBar.open('Link successfully saved', '', {
        panelClass: ['snackbar-success']
      });
      this.bsRef.dismiss();
    }
  }
}
