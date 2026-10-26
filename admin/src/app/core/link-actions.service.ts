import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { SHORT_HOST, shortUrl } from './firebase';

@Injectable({ providedIn: 'root' })
export class LinkActions {
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  async copy(short: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(shortUrl(short));
      this.snackBar.open(`Copied ${SHORT_HOST}/${short}`);
    } catch {
      this.snackBar.open('Copy failed. Select the link and copy it manually.');
    }
  }

  async showQr(short: string): Promise<void> {
    const { QrDialog } = await import('../shared/qr-dialog');
    this.dialog.open(QrDialog, { data: { short }, panelClass: 'glass-dialog', autoFocus: false });
  }
}
