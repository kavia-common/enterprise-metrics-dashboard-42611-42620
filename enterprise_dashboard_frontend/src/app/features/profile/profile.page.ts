import { Component, Signal, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeService } from '../../core/services/theme.service';

type ProfilePrefs = {
  name: string;
  phone?: string;
  department?: string;
  timezone?: string;
};

const STORAGE_KEY = 'profile_prefs';

/**
 * PUBLIC_INTERFACE
 * ProfilePageComponent
 * Simplified profile page accessible without authentication.
 * - Shows anonymous user info
 * - Allows editing display name, phone, department, timezone
 * - Persists to localStorage (SSR-safe guards)
 * - Shows current theme from ThemeService
 * - Provides a Change Password stub (no API calls)
 */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.css'],
})
export class ProfilePageComponent {
  // Anonymous user state (email/role are static in this demo)
  private _user = signal<{ email: string; role?: string; name: string } | null>({
    email: 'anonymous@example.com',
    role: undefined,
    name: 'Anonymous',
  });
  user: Signal<{ email: string; role?: string; name: string } | null> = this._user.asReadonly();

  theme: 'light' | 'dark';

  // Forms
  displayForm: FormGroup<{
    name: FormControl<string>;
    phone: FormControl<string>;
    department: FormControl<string>;
    timezone: FormControl<string>;
  }>;
  pwdForm: FormGroup<{
    current: FormControl<string>;
    next: FormControl<string>;
    confirm: FormControl<string>;
  }>;

  // Inline messages
  nameSaveSuccess = signal<string | null>(null);
  nameSaveError = signal<string | null>(null);
  pwdMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  timezones = signal<string[]>([]);
  // Whether window/Intl is available
  private getGlobal(): any {
    return typeof globalThis !== 'undefined' ? (globalThis as any) : ({} as any);
  }

  private safeLoadPrefs(): ProfilePrefs | null {
    const g = this.getGlobal();
    const ls: any = g?.localStorage;
    if (!ls || typeof ls.getItem !== 'function') return null;
    try {
      const raw = ls.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ProfilePrefs;
      return parsed;
    } catch {
      return null;
    }
  }

  private safeSavePrefs(prefs: ProfilePrefs): void {
    const g = this.getGlobal();
    const ls: any = g?.localStorage;
    if (!ls || typeof ls.setItem !== 'function') return;
    try {
      ls.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore storage errors
    }
  }

  private initTimezones(): void {
    const g = this.getGlobal();
    const IntlObj: any = g?.Intl;
    const hasSupportedValues = !!(IntlObj && typeof IntlObj.supportedValuesOf === 'function');
    if (hasSupportedValues) {
      try {
        const zones = IntlObj.supportedValuesOf('timeZone') as string[];
        this.timezones.set(zones || []);
        return;
      } catch {
        // fall through to curated list
      }
    }
    // Curated fallback list
    this.timezones.set([
      'UTC',
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Kolkata',
      'Australia/Sydney',
    ]);
  }

  constructor(private fb: FormBuilder, private themeService: ThemeService) {
    this.theme = this.themeService.getTheme();

    // Initialize timezones list
    this.initTimezones();

    // Load stored prefs if any
    const stored = this.safeLoadPrefs();

    // Seed name from stored prefs or default user signal
    const nameInit = (stored?.name ?? this._user()?.name) || 'Anonymous';
    // Persisted additional fields
    const phoneInit = stored?.phone ?? '';
    const deptInit = stored?.department ?? '';
    const tzInit = stored?.timezone ?? (this.timezones().includes('UTC') ? 'UTC' : (this.timezones()[0] || ''));

    // Set user state name from stored preference for display
    const existingUser = this._user();
    if (existingUser) {
      this._user.set({ ...existingUser, name: nameInit });
    }

    // Extend form with new fields
    // Phone pattern: allow numbers, spaces, hyphens, parentheses, plus; min 7 chars when present
    const phonePattern = /^[0-9\-\+\(\)\s]{7,}$/;

    this.displayForm = this.fb.group({
      name: this.fb.control(nameInit, { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
      phone: this.fb.control(phoneInit, {
        nonNullable: true,
        validators: [
          // optional, but if filled, must match pattern
          (c) => {
            const v = c.value?.trim();
            if (!v) return null;
            return phonePattern.test(v) ? null : { pattern: true };
          },
        ],
      }),
      department: this.fb.control(deptInit, { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
      timezone: this.fb.control(tzInit, { nonNullable: true, validators: [Validators.required] }),
    });

    this.pwdForm = this.fb.group({
      current: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.minLength(4)] }),
      next: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.minLength(4)] }),
      confirm: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.minLength(4)] }),
    });

    // Keep theme updated
    this.themeService.themeChanges().subscribe((t) => (this.theme = t));
  }

  // PUBLIC_INTERFACE
  saveDisplayName(): void {
    this.nameSaveSuccess.set(null);
    this.nameSaveError.set(null);
    if (this.displayForm.invalid) {
      this.displayForm.markAllAsTouched();
      this.nameSaveError.set('Please provide valid profile details.');
      return;
    }
    const u = this.user();
    if (!u) {
      this.nameSaveError.set('No user context available.');
      return;
    }
    const { name, phone, department, timezone } = this.displayForm.getRawValue();
    const updated = { ...u, name };
    this._user.set(updated);

    // Persist all fields locally
    const prefs: ProfilePrefs = {
      name,
      phone: (phone || '').trim() || undefined,
      department: (department || '').trim() || undefined,
      timezone: (timezone || '').trim() || undefined,
    };
    this.safeSavePrefs(prefs);

    this.nameSaveSuccess.set('Profile saved.');
  }

  // PUBLIC_INTERFACE
  submitPasswordChange(): void {
    this.pwdMessage.set(null);
    if (this.pwdForm.invalid) {
      this.pwdForm.markAllAsTouched();
      this.pwdMessage.set({ type: 'error', text: 'Please complete all fields correctly.' });
      return;
    }
    const { next, confirm } = this.pwdForm.getRawValue();
    if (next !== confirm) {
      this.pwdMessage.set({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    this.pwdMessage.set({ type: 'success', text: 'Your password has been changed (mock).' });
    this.pwdForm.reset({ current: '', next: '', confirm: '' });
  }
}
