import { Injectable, Signal, signal } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

/**
 * PUBLIC_INTERFACE
 * AuthUser
 * Represents a minimal authenticated user object for mock auth.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
}

/**
 * PUBLIC_INTERFACE
 * AuthService
 * Mock authentication service providing:
 * - in-memory user store with hardcoded users
 * - fake JWT persistence in localStorage
 * - isAuthenticated$ observable and currentUser signal
 * - login and logout helpers
 *
 * No backend calls are made. Optionally uses environment variables for base URLs if needed elsewhere.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly USER_KEY = 'auth_user';

  // Hardcoded mock users
  private readonly users = [
    { id: '1', email: 'admin@example.com', name: 'Admin', role: 'admin', password: 'admin123' },
    { id: '2', email: 'alex@example.com', name: 'Alex', role: 'user', password: 'password' },
  ];

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());
  /** Emits true when a token is present, false otherwise. */
  isAuthenticated$: Observable<boolean> = this.isAuthenticatedSubject.asObservable();

  // Expose current user as a signal to easily bind in components
  private currentUserSignal = signal<AuthUser | null>(this.getStoredUser());
  /** PUBLIC_INTERFACE: Returns current user as a readonly signal */
  get currentUser(): Signal<AuthUser | null> {
    return this.currentUserSignal.asReadonly();
  }

  constructor() {
    // Listen cross-tab storage events to sync auth state
    const g = (typeof globalThis !== 'undefined' ? (globalThis as any) : {}) as any;
    const win: any = g.window;
    if (win && typeof win.addEventListener === 'function') {
      win.addEventListener('storage', (e: any) => {
        if (!e) return;
        if (e.key === AuthService.TOKEN_KEY || e.key === AuthService.USER_KEY) {
          this.isAuthenticatedSubject.next(this.hasValidToken());
          this.currentUserSignal.set(this.getStoredUser());
        }
      });
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Attempts to login with provided credentials against in-memory users.
   * On success: stores a mock JWT and user profile in localStorage.
   * On failure: returns an error object.
   */
  login(email: string, password: string): Observable<{ success: true } | { success: false; error: string }> {
    const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      return of({ success: false as const, error: 'Invalid email or password' });
    }
    // Create a fake token (non-JWT shape for simplicity). Avoid btoa to support SSR.
    const token = `mock.${this.encodeBase64(user.id)}.${Date.now()}`;
    this.persistToken(token);
    this.persistUser({ id: user.id, email: user.email, name: user.name, role: user.role });

    this.isAuthenticatedSubject.next(true);
    this.currentUserSignal.set({ id: user.id, email: user.email, name: user.name, role: user.role });

    return of({ success: true as const });
  }

  /**
   * PUBLIC_INTERFACE
   * Clears token and user data.
   */
  logout(): void {
    this.clearStorage();
    this.isAuthenticatedSubject.next(false);
    this.currentUserSignal.set(null);
  }

  /**
   * PUBLIC_INTERFACE
   * Returns the current mock token if present.
   */
  getToken(): string | null {
    const ls: any = (typeof globalThis !== 'undefined' ? (globalThis as any) : {}).localStorage;
    if (!ls || typeof ls.getItem !== 'function') return null;
    try {
      return ls.getItem(AuthService.TOKEN_KEY);
    } catch {
      return null;
    }
  }

  // Helpers

  private hasValidToken(): boolean {
    return !!this.getToken();
  }

  private persistToken(token: string): void {
    const ls: any = (typeof globalThis !== 'undefined' ? (globalThis as any) : {}).localStorage;
    if (!ls || typeof ls.setItem !== 'function') return;
    try {
      ls.setItem(AuthService.TOKEN_KEY, token);
    } catch {
      // ignore
    }
  }

  private persistUser(user: AuthUser): void {
    const ls: any = (typeof globalThis !== 'undefined' ? (globalThis as any) : {}).localStorage;
    if (!ls || typeof ls.setItem !== 'function') return;
    try {
      ls.setItem(AuthService.USER_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  }

  private getStoredUser(): AuthUser | null {
    const ls: any = (typeof globalThis !== 'undefined' ? (globalThis as any) : {}).localStorage;
    if (!ls || typeof ls.getItem !== 'function') return null;
    try {
      const raw = ls.getItem(AuthService.USER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.email) return parsed as AuthUser;
      return null;
    } catch {
      return null;
    }
  }

  private clearStorage(): void {
    const ls: any = (typeof globalThis !== 'undefined' ? (globalThis as any) : {}).localStorage;
    if (!ls || typeof ls.removeItem !== 'function') return;
    try {
      ls.removeItem(AuthService.TOKEN_KEY);
      ls.removeItem(AuthService.USER_KEY);
    } catch {
      // ignore
    }
  }

  // Cross-platform base64 encoding (browser/node)
  private encodeBase64(input: string): string {
    const g: any = (typeof globalThis !== 'undefined' ? globalThis : {}) as any;
    try {
      if (typeof g.btoa === 'function') {
        return g.btoa(input);
      }
    } catch {
      /* ignore and fallback */
    }
    try {
      // Node.js Buffer
      // eslint-disable-next-line no-undef
      return Buffer.from(input, 'utf-8').toString('base64');
    } catch {
      return input;
    }
  }
}
