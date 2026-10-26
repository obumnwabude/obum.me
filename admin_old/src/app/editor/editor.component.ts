import { Component, EventEmitter, Output } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  Firestore,
  setDoc
} from '@angular/fire/firestore';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgxUiLoaderService } from 'ngx-ui-loader';

import { constants } from '../constants';
import { EditorService } from '../editor.service';
import { Link } from '../link';

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
    public editorService: EditorService,
    private firestore: Firestore,
    private ngxLoader: NgxUiLoaderService,
    private snackBar: MatSnackBar
  ) {
    if (this.editorService.currentLink) {
      this.short.setValue(this.editorService.currentLink.short);
      this.long.setValue(this.editorService.currentLink.long);
    }
  }

  async deleteLink(): Promise<void> {
    if (this.editorService.currentLink) {
      try {
        this.ngxLoader.start();
        await deleteDoc(
          doc(this.firestore, `/links/${this.editorService.currentLink.id}`)
        );
        this.snackBar.open('Link successfully deleted', '', {
          panelClass: ['snackbar-success']
        });
        localStorage.removeItem(LS_SHORT_KEY);
        localStorage.removeItem(LS_LONG_KEY);
        this.editorService.currentLink = null;
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
    } else {
      this.snackBar.open('Create Link instead.', '', {
        panelClass: ['snackbar-error']
      });
    }
  }

  async saveLink(): Promise<void> {
    if (this.link.invalid) {
      this.snackBar.open('Please resolve all errors', '', {
        panelClass: ['snackbar-error']
      });
    } else {
      try {
        this.ngxLoader.start();
        const currentLink = this.editorService.currentLink;
        if (currentLink) {
          await setDoc(
            doc(this.firestore, `/links/${currentLink.id}`),
            { ...this.link.value },
            { merge: true }
          );
        } else {
          await addDoc(
            collection(this.firestore, 'links').withConverter(Link.converter),
            { id: '', createdAt: new Date(), ...this.link.value }
          );
        }
        this.snackBar.open('Link successfully saved', '', {
          panelClass: ['snackbar-success']
        });
        localStorage.removeItem(LS_SHORT_KEY);
        localStorage.removeItem(LS_LONG_KEY);
        this.editorService.currentLink = null;
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
