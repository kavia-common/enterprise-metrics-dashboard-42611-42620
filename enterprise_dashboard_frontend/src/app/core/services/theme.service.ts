import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * PUBLIC_INTERFACE
 * ThemeService
 * Manages application theme (light/dark): initialization, persistence in localStorage,
 * applying theme classes to the document root, and exposing an observable for components.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly STORAGE_KEY = 'theme'; // 'light' | 'dark'
  private theme$ = new BehaviorSubject<'light' | 'dark'>(this.detectInitialTheme());

  constructor() {
    // Apply on construction
    this.applyTheme(this.theme$.value);

    // Listen to storage events from other tabs and update accordingly (browser only)
    const g = (typeof globalThis !== 'undefined' ? (globalThis as any) : {}) as any;
    const win: any = g.window;
    if (win && typeof win.addEventListener === 'function') {
      win.addEventListener('storage', (e: any) => {
        if (e && e.key === ThemeService.STORAGE_KEY) {
          const val = (e.newValue as 'light' | 'dark') ?? this.detectInitialTheme();
          this.setTheme(val, false);
        }
      });
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Returns the current theme value.
   */
  getTheme(): 'light' | 'dark' {
    return this.theme$.value;
  }

  /**
   * PUBLIC_INTERFACE
   * Observable for theme changes.
   */
  themeChanges() {
    return this.theme$.asObservable();
  }

  /**
   * PUBLIC_INTERFACE
   * Sets theme explicitly and optionally persists it (default true).
   */
  setTheme(theme: 'light' | 'dark', persist = true): void {
    if (this.theme$.value === theme) return;
    this.theme$.next(theme);
    this.applyTheme(theme);

    const g = (typeof globalThis !== 'undefined' ? (globalThis as any) : {}) as any;
    const ls: any = g.localStorage;
    if (persist && ls && typeof ls.setItem === 'function') {
      try {
        ls.setItem(ThemeService.STORAGE_KEY, theme);
      } catch {
        // ignore storage errors
      }
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Toggle theme between 'light' and 'dark' and persist.
   */
  toggleTheme(): void {
    const next = this.theme$.value === 'light' ? 'dark' : 'light';
    this.setTheme(next, true);
  }

  private detectInitialTheme(): 'light' | 'dark' {
    const g = (typeof globalThis !== 'undefined' ? (globalThis as any) : {}) as any;
    const ls: any = g.localStorage;
    // 1) Stored preference
    if (ls && typeof ls.getItem === 'function') {
      try {
        const saved = ls.getItem(ThemeService.STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
      } catch {
        // ignore storage errors
      }
    }
    // 2) System preference
    const win: any = g.window;
    if (win && typeof win.matchMedia === 'function') {
      try {
        if (win.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
        }
      } catch {
        // ignore
      }
    }
    // 3) Default to light
    return 'light';
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    const g = (typeof globalThis !== 'undefined' ? (globalThis as any) : {}) as any;
    const doc: any = g.document;
    if (!doc || !doc.documentElement) return;
    const root = doc.documentElement as HTMLElement;
    // Use classes at root for CSS variables
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');

    // Also set meta color-scheme attribute by toggling data attribute
    root.setAttribute('data-color-scheme', theme);
  }
}
