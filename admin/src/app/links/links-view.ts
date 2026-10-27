import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
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
  { key: 'clicks', label: 'Most clicked', adminOnly: true },
  { key: 'trending', label: 'Most clicked in 30 days', adminOnly: true },
  { key: 'recent', label: 'Recently clicked', adminOnly: true },
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

  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private readonly chipsWrap = viewChild<ElementRef<HTMLElement>>('chipsWrap');
  private readonly chipScroller = viewChild<ElementRef<HTMLElement>>('chipScroller');

  protected readonly canScrollLeft = signal(false);
  protected readonly canScrollRight = signal(false);
  /** Distance from the page content to each screen edge, so the chips can run edge to edge. */
  protected readonly bleed = signal({ left: 16, right: 16 });

  /** True while the toolbar is stuck under the header, so it can switch to glass. */
  protected readonly stuck = signal(false);
  protected readonly skeletons = [0, 1, 2, 3, 4, 5];

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
    const recentClicks = (link: Link) => this.api.overview()?.perLink[link.short]?.total ?? 0;

    const rows = this.rows().filter((row) => {
      if (filter === ALL) return true;
      return filter.startsWith('#') ? row.link.tags.includes(filter.slice(1)) : row.label === filter;
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
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const target = this.sentinel()?.nativeElement;
      if (!target) return;
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 72;
      const observer = new IntersectionObserver(([entry]) => this.stuck.set(!entry.isIntersecting), {
        rootMargin: `-${header + 1}px 0px 0px 0px`,
      });
      observer.observe(target);
      destroyRef.onDestroy(() => observer.disconnect());

      // Measure how far the content sits from each screen edge, and keep the arrows in sync.
      const measure = () => {
        const wrap = this.chipsWrap()?.nativeElement.parentElement;
        if (wrap) {
          const rect = wrap.getBoundingClientRect();
          const viewport = document.documentElement.clientWidth;
          this.bleed.set({ left: Math.max(0, Math.round(rect.left)), right: Math.max(0, Math.round(viewport - rect.right)) });
        }
        requestAnimationFrame(() => this.updateChipArrows());
      };
      const resize = new ResizeObserver(measure);
      resize.observe(document.documentElement);
      if (this.chipScroller()) resize.observe(this.chipScroller()!.nativeElement);
      destroyRef.onDestroy(() => resize.disconnect());
      measure();
      // Bring a remembered filter into view.
      requestAnimationFrame(() =>
        this.chipScroller()?.nativeElement.querySelector('.chip.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
      );
    });

    // Chips change as links load or tags change: re-check whether there is more to scroll.
    effect(() => {
      this.chips();
      requestAnimationFrame(() => this.updateChipArrows());
    });

    // A saved filter that no longer exists (e.g. its last link was deleted) falls back to All.
    effect(() => {
      const filter = this.filter();
      if (!this.linksService.loading() && filter !== ALL && !this.chips().some(([name]) => name === filter)) {
        this.setFilter(ALL);
      }
    });
    effect(() => {
      // Click-based sorts are admin-only, since click numbers are private.
      const clickSorts: SortKey[] = ['clicks', 'trending', 'recent'];
      if (clickSorts.includes(this.sort()) && !this.auth.isAdmin() && this.auth.ready()) this.setSort('newest');
    });
  }

  protected updateChipArrows(): void {
    const scroller = this.chipScroller()?.nativeElement;
    if (!scroller) return;
    this.canScrollLeft.set(scroller.scrollLeft > 2);
    this.canScrollRight.set(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2);
  }

  /** Scrolls the chips by most of the visible width in the given direction. */
  protected scrollChips(direction: 1 | -1): void {
    const scroller = this.chipScroller()?.nativeElement;
    if (!scroller) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroller.scrollBy({ left: direction * scroller.clientWidth * 0.7, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /** Keeps a chip that was just chosen fully visible. */
  protected revealChip(event: Event): void {
    (event.currentTarget as HTMLElement).scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
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
    (event.target as HTMLElement).parentElement?.classList.add('missing');
  }
}
