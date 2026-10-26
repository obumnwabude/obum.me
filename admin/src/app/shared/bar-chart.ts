import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface DayValue {
  day: string;
  clicks: number;
}

const dayLabel = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Daily clicks as bars, with every missing day filled in as zero. */
@Component({
  selector: 'obum-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart" role="img" [attr.aria-label]="summary()">
      @for (bar of bars(); track bar.day) {
        <span class="bar" [style.height.%]="bar.height" [title]="bar.title"></span>
      }
    </div>
    <div class="axis">
      <span>{{ first() }}</span>
      <span>peak {{ peak() }} a day</span>
      <span>{{ last() }}</span>
    </div>
  `,
  styles: `
    :host { display: block; }
    .chart { display: flex; align-items: flex-end; gap: 2px; height: 120px; }
    .bar {
      flex: 1;
      min-height: 2px;
      border-radius: 3px 3px 1px 1px;
      background: linear-gradient(180deg, var(--primary), rgb(from var(--primary) r g b / 55%));
    }
    .bar[style*='height: 0%'] { background: var(--glass-border); }
    .axis { display: flex; justify-content: space-between; margin-top: 6px; font-size: 12px; color: var(--gray); }
  `,
})
export class BarChart {
  readonly data = input.required<DayValue[]>();
  readonly days = input(30);

  private readonly filled = computed(() => {
    const byDay = new Map(this.data().map((point) => [point.day, point.clicks]));
    const today = new Date();
    const result: DayValue[] = [];
    for (let offset = this.days() - 1; offset >= 0; offset--) {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
      const day = date.toISOString().slice(0, 10);
      result.push({ day, clicks: byDay.get(day) ?? 0 });
    }
    return result;
  });

  protected readonly peak = computed(() => Math.max(0, ...this.filled().map((point) => point.clicks)));

  protected readonly bars = computed(() => {
    const max = Math.max(1, this.peak());
    return this.filled().map((point) => ({
      day: point.day,
      height: Math.round((point.clicks / max) * 100),
      title: `${dayLabel.format(new Date(point.day))}: ${point.clicks} click${point.clicks === 1 ? '' : 's'}`,
    }));
  });

  protected readonly first = computed(() => dayLabel.format(new Date(this.filled()[0]?.day ?? Date.now())));
  protected readonly last = computed(() => dayLabel.format(new Date(this.filled().at(-1)?.day ?? Date.now())));
  protected readonly summary = computed(() => {
    const total = this.filled().reduce((sum, point) => sum + point.clicks, 0);
    return `${total} clicks over the last ${this.days()} days, peaking at ${this.peak()} in a day`;
  });
}
