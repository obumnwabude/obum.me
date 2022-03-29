import { Component, EventEmitter, Output } from '@angular/core';
import { addDoc, collection, Firestore } from '@angular/fire/firestore';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgxUiLoaderService } from 'ngx-ui-loader';

import { constants } from '../constants';

const { LS_SHORT_KEY, LS_LONG_KEY } = constants;

@Component({
  selector: 'obum-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent {
  short = new FormControl(localStorage.getItem(LS_SHORT_KEY) ?? '', [
    Validators.pattern(/^(\w|\-)*$/),
    Validators.required
  ]);
  long = new FormControl(localStorage.getItem(LS_LONG_KEY) ?? '', [
    Validators.pattern(/^https:\/\//),
    Validators.required
  ]);
  link = new FormGroup({ short: this.short, long: this.long });
  ls = localStorage;
  LS_SHORT_KEY = LS_SHORT_KEY;
  LS_LONG_KEY = LS_LONG_KEY;
  @Output() cancel = new EventEmitter<boolean>();

  constructor(
    private firestore: Firestore,
    private ngxLoader: NgxUiLoaderService,
    private snackBar: MatSnackBar
  ) {}

  async saveLink(e: any): Promise<void> {
    if (this.link.invalid) {
      this.snackBar.open('Please resolve all errors', '', {
        panelClass: ['snackbar-error']
      });
    } else {
      try {
        this.ngxLoader.start();
        await addDoc(collection(this.firestore, 'links'), this.link.value);
        this.snackBar.open('Link successfully saved', '', {
          panelClass: ['snackbar-success']
        });
        localStorage.removeItem(LS_SHORT_KEY);
        localStorage.removeItem(LS_LONG_KEY);
        e.target.reset();
        this.link.reset();
        this.cancel.emit();
      } catch (error: any) {
        console.error(error);
        this.snackBar.open(error.message, '', {
          panelClass: ['snackbar-error']
        });
      } finally {
        this.ngxLoader.stop();
      }
    }
  }
}
