import { Injectable, signal } from '@angular/core';

export type PanelState =
  | { mode: 'closed' }
  | { mode: 'new'; short?: string; long?: string }
  | { mode: 'link'; id: string; edit: boolean };

/** Which side panel / bottom sheet is open: a new link, or one link's details. */
@Injectable({ providedIn: 'root' })
export class PanelService {
  readonly state = signal<PanelState>({ mode: 'closed' });

  openNew(prefill: { short?: string; long?: string } = {}): void {
    this.state.set({ mode: 'new', ...prefill });
  }

  openLink(id: string, edit = false): void {
    this.state.set({ mode: 'link', id, edit });
  }

  close(): void {
    this.state.set({ mode: 'closed' });
  }
}
