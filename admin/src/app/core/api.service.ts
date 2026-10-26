import { Injectable, effect, inject, signal } from '@angular/core';

import { AuthService } from './auth.service';
import { API_BASE } from './firebase';

export interface Overview {
  days: number;
  perLink: Record<string, { total: number; daily: Record<string, number> }>;
  misses: { slug: string; hits: number }[];
  botHits: number;
}

export interface Breakdown {
  name: string;
  clicks: number;
}

export interface LinkStats {
  slug: string;
  days: number;
  daily: { day: string; clicks: number }[];
  countries: Breakdown[];
  referrers: Breakdown[];
  devices: Breakdown[];
  cities: Breakdown[];
}

/** Talks to the Cloudflare Worker's admin API on obum.me/_api. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly auth = inject(AuthService);

  readonly overview = signal<Overview | null>(null);
  readonly overviewError = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.auth.isAdmin()) void this.loadOverview();
      else this.overview.set(null);
    });
  }

  async loadOverview(days = 30): Promise<void> {
    try {
      this.overview.set(await this.call<Overview>(`/overview?days=${days}`));
      this.overviewError.set(null);
    } catch (error) {
      this.overviewError.set(error instanceof Error ? error.message : String(error));
    }
  }

  stats(short: string, days: number): Promise<LinkStats> {
    return this.call<LinkStats>(`/stats?short=${encodeURIComponent(short)}&days=${days}`);
  }

  /** Clears the Worker's edge cache for these short names so edits apply at once. Best effort. */
  async purge(shorts: string[]): Promise<void> {
    const unique = [...new Set(shorts.filter(Boolean))];
    if (!unique.length) return;
    await this.call('/purge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shorts: unique }),
    }).catch(() => undefined);
  }

  /** Daily clicks for the last `days` days (oldest first), from the overview. */
  series(short: string, days = 30): number[] {
    const daily = this.overview()?.perLink[short]?.daily ?? {};
    const values: number[] = [];
    const today = new Date();
    for (let offset = days - 1; offset >= 0; offset--) {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
      values.push(daily[date.toISOString().slice(0, 10)] ?? 0);
    }
    return values;
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.auth.idToken();
    if (!token) throw new Error('Sign in to see click analytics.');
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), authorization: `Bearer ${token}` },
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(body.error ?? `The analytics service answered ${response.status}.`);
    return body as T;
  }
}
