const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

export function timeAgo(date: Date | null | undefined): string {
  if (!date) return 'never';
  const seconds = (date.getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

export const compactNumber = (value: number) => (value < 10000 ? value.toLocaleString('en') : compact.format(value));

/** "NG" -> "🇳🇬 Nigeria". Unknown codes are returned as-is. */
export function countryLabel(code: string): string {
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX') return code === 'XX' ? 'Unknown' : code;
  const flag = String.fromCodePoint(...[...code].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
  let name = code;
  try {
    name = regionNames.of(code) ?? code;
  } catch {
    /* keep the code */
  }
  return `${flag} ${name}`;
}

export const DEVICE_LABELS: Record<string, string> = {
  mobile: 'Phone',
  tablet: 'Tablet',
  desktop: 'Computer',
  bot: 'Link previews & bots',
};
