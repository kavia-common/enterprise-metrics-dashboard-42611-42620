import { Component, computed, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, AuthUser } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

/**
 * PUBLIC_INTERFACE
 * ProfilePageComponent
 * Displays and allows editing of the current user's profile (mock auth).
 * - Shows name, email, role from AuthService
 * - Allows editing display name and saves back to AuthService/localStorage
 * - Shows current theme from ThemeService
 * - Provides a Change Password stub (validates fields, shows success/failure message; no API calls)
 */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.css'],
})
export class ProfilePageComponent {
  // Signals for current user and theme
  user: Signal<AuthUser | null>;
  theme: 'light' | 'dark';

  // Forms
  displayForm: FormGroup<{
    name: FormControl<string>;
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

  constructor(private fb: FormBuilder, private auth: AuthService, private themeService: ThemeService) {
    this.user = this.auth.currentUser;
    this.theme = this.themeService.getTheme();

    const nameInit = this.user()?.name ?? '';
    this.displayForm = this.fb.group({
      name: this.fb.control(nameInit, { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
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
      this.nameSaveError.set('Please provide a valid display name.');
      return;
    }
    const u = this.user();
    if (!u) {
      this.nameSaveError.set('You are not authenticated.');
      return;
    }
    const updated: AuthUser = { ...u, name: this.displayForm.controls.name.value };
    // Persist back to AuthService localStorage by reusing private helpers via logout/login pattern is heavy;
    // Instead, we expose a safe update path below by updating storage keys consistently with AuthService.
    try {
      const g: any = (typeof globalThis !== 'undefined' ? (globalThis as any) : {}) as any;
      const ls: any = g.localStorage;
      if (ls && typeof ls.setItem === 'function') {
        ls.setItem('auth_user', JSON.stringify(updated));
      }
      // update live signal via a small hack: trigger storage event logic by manually updating current value via service internal signal (not accessible).
      // Since currentUser is exposed as readonly signal, we can't set it directly.
      // Workaround: perform a no-op logout/login-like update by reading token and re-setting user.
      // Safer approach: call a dedicated method if exists. As it's not available, we emulate an event:
      // The AuthService listens to storage events; force a storage event by using removeItem then setItem (if available).
      if (ls && typeof ls.removeItem === 'function') {
        const raw = ls.getItem('auth_user');
        ls.removeItem('auth_user');
        ls.setItem('auth_user', raw);
      }
      this.nameSaveSuccess.set('Display name saved.');
    } catch {
      this.nameSaveError.set('Failed to save. Storage is not available.');
    }
  }

  // PUBLIC_INTERFACE
  submitPasswordChange(): void {
    this.pwdMessage.set(null);
    if (this.pwdForm.invalid) {
      this.pwdForm.markAllAsTouched();
      this.pwdMessage.set({ type: 'error', text: 'Please complete all fields correctly.' });
      return;
    }
    const { current, next, confirm } = this.pwdForm.getRawValue();
    if (next !== confirm) {
      this.pwdMessage.set({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    if (current === next) {
      this.pwdMessage.set({ type: 'error', text: 'New password must be different from current password.' });
      return;
    }
    // No backend; just show success
    this.pwdMessage.set({ type: 'success', text: 'Your password has been changed (mock).' });
    this.pwdForm.reset({ current: '', next: '', confirm: '' });
  }
}
