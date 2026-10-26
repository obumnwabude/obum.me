import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import QRCode from 'qrcode';

import { SHORT_HOST, shortUrl } from '../core/firebase';

@Component({
  selector: 'obum-qr-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="qr-title">
      <span class="host">{{ host }}/</span><span class="slug">{{ data.short }}</span>
    </h2>
    <mat-dialog-content>
      <div class="qr-frame">
        @if (png(); as src) {
          <img [src]="src" [alt]="'QR code for ' + host + '/' + data.short" width="280" height="280" />
        }
      </div>
      <p class="hint">Scans open {{ host }}/{{ data.short }}, so each scan counts as a click.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="downloadSvg()"><mat-icon>download</mat-icon>SVG</button>
      <button mat-flat-button type="button" (click)="downloadPng()"><mat-icon>download</mat-icon>PNG</button>
    </mat-dialog-actions>
  `,
  styles: `
    .qr-title { display: flex; align-items: baseline; gap: 0; }
    .qr-title .host { color: var(--gray); font-weight: 500; }
    .qr-title .slug { color: var(--primary); font-weight: 700; }
    .qr-frame { display: grid; place-items: center; padding: 16px; border-radius: 20px; background: #fff; width: fit-content; margin: 0 auto; }
    .qr-frame img { display: block; width: min(280px, 64vw); height: auto; }
    .hint { color: var(--gray); font-size: 13px; text-align: center; margin: 12px 0 0; }
  `,
})
export class QrDialog {
  protected readonly data = inject<{ short: string }>(MAT_DIALOG_DATA);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly host = SHORT_HOST;
  protected readonly png = signal<string | null>(null);

  constructor() {
    QRCode.toDataURL(shortUrl(this.data.short), { width: 840, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => this.png.set(url))
      .catch(() => this.snackBar.open('Could not draw the QR code.'));
  }

  protected downloadPng(): void {
    const url = this.png();
    if (url) this.save(url, 'png');
  }

  protected async downloadSvg(): Promise<void> {
    const svg = await QRCode.toString(shortUrl(this.data.short), { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    this.save(url, 'svg');
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  private save(href: string, extension: string): void {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `obum.me-${this.data.short}.${extension}`;
    anchor.click();
  }
}
