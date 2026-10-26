import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { SHORT_HOST } from '../core/firebase';
import { LinkActions } from '../core/link-actions.service';
import { type Link, LinksService } from '../core/links.service';
import { PanelService } from '../core/panel.service';
import { destinationOf, faviconUrl } from '../shared/destination';
import { compactNumber, timeAgo } from '../shared/format';
import { Sparkline } from '../shared/sparkline';

type SortKey = 'newest' | 'oldest' | 'clicks' | 'trending' | 'recent' | 'az';

const SORTS: { key: SortKey; label: string; adminOnly?: boolean }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'clicks', label: 'Most clicked' },
  { key: 'trending', label: 'Most clicked in 30 days', adminOnly: true },
  { key: 'recent', label: 'Recently clicked' },
  { key: 'az', label: 'Short name A–Z' },
];

const ALL = 'All';

function stored<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback;
  } catch {
    return fallback;
  }
}

function remember(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

interface Row {
  link: Link;
  label: string;
  host: string;
  rest: string;
  favicon: string;
}

@Component({
  selector: 'obum-links-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatButtonModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule, MatTooltipModule, Sparkline],
  templateUrl: './links-view.html',
  styleUrl: './links-view.scss',
})
export class LinksView {
  protected readonly auth = inject(AuthService);
  protected readonly api = inject(ApiService);
  protected readonly linksService = inject(LinksService);
  protected readonly panel = inject(PanelService);
  protected readonly actions = inject(LinkActions);

  protected readonly host = SHORT_HOST;
  protected readonly location = window.location;
  protected readonly compact = compactNumber;
  protected readonly timeAgo = timeAgo;

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly query = signal('');
  protected readonly filter = signal<string>(stored<string>('links.filter', ALL));
  protected readonly sort = signal<SortKey>(stored<SortKey>('links.sort', 'newest'));
  protected readonly sorts = computed(() => SORTS.filter((sort) => !sort.adminOnly || this.auth.isAdmin()));
  protected readonly sortLabel = computed(() => SORTS.find((sort) => sort.key === this.sort())?.label ?? '');

  private readonly rows = computed<Row[]>(() =>
    this.linksService.links().map((link) => {
      const destination = destinationOf(link.long);
      return { link, ...destination, favicon: faviconUrl(destination.host) };
    }),
  );

  /** Filter chips: destination groups first, then tags, each with a count. */
  protected readonly chips = computed(() => {
    const counts = new Map<string, number>();
    for (const row of this.rows()) {
      counts.set(row.label, (counts.get(row.label) ?? 0) + 1);
    }
    const groups = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const tagCounts = new Map<string, number>();
    for (const row of this.rows()) for (const tag of row.link.tags) tagCounts.set(`#${tag}`, (tagCounts.get(`#${tag}`) ?? 0) + 1);
    const tags = [...tagCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return [[ALL, this.rows().length] as [string, number], ...groups, ...tags];
  });

  protected readonly visible = computed(() => {
    const filter = this.filter();
    const terms = this.query().trim().toLowerCase().split(/\s+/).filter(Boolean);
    const recentClicks = (link: Link) => this.api.overview()?.perLink[link.short]?.total ?? 0;

    const rows = this.rows().filter((row) => {
      if (filter !== ALL) {
        if (filter.startsWith('#') ? !row.link.tags.includes(filter.slice(1)) : row.label !== filter) return false;
      }
      if (!terms.length) return true;
      const haystack = `${row.link.short} ${row.link.long} ${row.label} ${row.link.tags.join(' ')}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });

    const time = (date: Date | null) => date?.getTime() ?? 0;
    const compare: Record<SortKey, (a: Row, b: Row) => number> = {
      newest: (a, b) => time(b.link.createdAt) - time(a.link.createdAt),
      oldest: (a, b) => time(a.link.createdAt) - time(b.link.createdAt),
      clicks: (a, b) => b.link.clicks - a.link.clicks || time(b.link.createdAt) - time(a.link.createdAt),
      trending: (a, b) => recentClicks(b.link) - recentClicks(a.link) || b.link.clicks - a.link.clicks,
      recent: (a, b) => time(b.link.lastClickedAt) - time(a.link.lastClickedAt),
      az: (a, b) => a.link.short.localeCompare(b.link.short),
    };
    return rows.sort(compare[this.sort()]);
  });

  protected readonly totalClicks = computed(() => this.linksService.links().reduce((sum, link) => sum + link.clicks, 0));
  protected readonly recentTotal = computed(() => {
    const perLink = this.api.overview()?.perLink;
    return perLink ? Object.values(perLink).reduce((sum, entry) => sum + entry.total, 0) : null;
  });
  protected readonly misses = computed(() => this.api.overview()?.misses ?? []);
  protected readonly showMisses = signal(false);

  constructor() {
    // A saved filter that no longer exists (e.g. its last link was deleted) falls back to All.
    effect(() => {
      const filter = this.filter();
      if (!this.linksService.loading() && filter !== ALL && !this.chips().some(([name]) => name === filter)) {
        this.setFilter(ALL);
      }
    });
    effect(() => {
      if (this.sort() === 'trending' && !this.auth.isAdmin() && this.auth.ready()) this.setSort('newest');
    });
  }

  focusSearch(): void {
    this.searchInput()?.nativeElement.focus();
    this.searchInput()?.nativeElement.select();
  }

  protected setFilter(value: string): void {
    this.filter.set(value);
    remember('links.filter', value);
  }

  protected setSort(value: SortKey): void {
    this.sort.set(value);
    remember('links.sort', value);
  }

  protected clearSearch(): void {
    this.query.set('');
    this.setFilter(ALL);
  }

  protected open(row: Row): void {
    this.panel.openLink(row.link.id);
  }

  protected series(short: string): number[] {
    return this.api.series(short, 30);
  }

  protected recent(short: string): number {
    return this.api.overview()?.perLink[short]?.total ?? 0;
  }

  protected hideFavicon(event: Event): void {
    (event.target as HTMLImageElement).style.visibility = 'hidden';
  }
}
