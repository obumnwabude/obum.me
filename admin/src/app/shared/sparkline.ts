import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** A tiny line of daily clicks. Flat line when there is no activity. */
@Component({
  selector: 'obum-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" [attr.width]="width" [attr.height]="height" aria-hidden="true">
      <path class="area" [attr.d]="area()" />
      <path class="line" [attr.d]="line()" />
    </svg>
  `,
  styles: `
    :host { display: inline-flex; }
    .line { fill: none; stroke: var(--primary); stroke-width: 1.5; stroke-linejoin: round; stroke-linecap: round; }
    .area { fill: rgb(from var(--primary) r g b / 12%); }
  `,
})
export class Sparkline {
  readonly values = input.required<number[]>();
  protected readonly width = 88;
  protected readonly height = 26;

  private readonly points = computed(() => {
    const values = this.values();
    const max = Math.max(1, ...values);
    const step = values.length > 1 ? this.width / (values.length - 1) : this.width;
    return values.map((value, index) => [index * step, this.height - 2 - (value / max) * (this.height - 4)] as const);
  });

  protected readonly line = computed(() =>
    this.points()
      .map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(' '),
  );

  protected readonly area = computed(() => {
    const points = this.points();
    if (!points.length) return '';
    return `${this.line()} L${points.at(-1)![0].toFixed(1)} ${this.height} L0 ${this.height} Z`;
  });
}
