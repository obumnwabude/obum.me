import { Injectable, computed, signal } from '@angular/core';

export type ThemeMode = 'Light Theme' | 'Dark Theme' | 'Device Default';
export const THEME_MODES: ThemeMode[] = ['Light Theme', 'Dark Theme', 'Device Default'];
export const THEME_ICONS: Record<ThemeMode, string> = {
  'Light Theme': 'light_mode',
  'Dark Theme': 'dark_mode',
  'Device Default': 'contrast',
};

const STORAGE_KEY = 'theme';

function storedMode(): ThemeMode {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return THEME_MODES.includes(value as ThemeMode) ? (value as ThemeMode) : 'Device Default';
  } catch {
    return 'Device Default';
  }
}

/** Light / Dark / Device Default, the same three choices as obumnwabude.com. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media.matches);

  readonly mode = signal<ThemeMode>(storedMode());
  readonly isDark = computed(
    () => this.mode() === 'Dark Theme' || (this.mode() === 'Device Default' && this.systemDark()),
  );

  constructor() {
    this.media.addEventListener('change', (event) => {
      this.systemDark.set(event.matches);
      this.applyToDocument();
    });
    this.applyToDocument();
  }

  /** Switches theme with the same circular reveal the portfolio uses, from where the click happened. */
  set(mode: ThemeMode, event?: MouseEvent): void {
    const commit = () => {
      this.mode.set(mode);
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        /* private mode: keep the choice for this visit only */
      }
      this.applyToDocument();
    };

    const doc = document as Document & { startViewTransition?: (update: () => void) => { ready: Promise<void> } };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || reduceMotion) {
      commit();
      return;
    }

    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? 0;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = doc.startViewTransition(commit);
    transition.ready
      .then(() =>
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 480, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
        ),
      )
      .catch(() => undefined);
  }

  private applyToDocument(): void {
    const root = document.documentElement;
    root.style.colorScheme = this.isDark() ? 'dark' : 'light';
    root.classList.toggle('dark', this.isDark());
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', this.isDark() ? '#07090e' : '#f8fafd');
  }
}
