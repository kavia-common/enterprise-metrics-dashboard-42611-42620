import { Component, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeService } from '../../core/services/theme.service';

/**
 * PUBLIC_INTERFACE
 * ProfilePageComponent
 * Simplified profile page accessible without authentication.
 * - Shows anonymous user info
 * - Allows editing display name locally (no persistence across reloads)
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
  // Anonymous user state
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

  constructor(private fb: FormBuilder, private themeService: ThemeService) {
    this.theme = this.themeService.getTheme();

    const nameInit = this.user()?.name ?? 'Anonymous';
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
      this.nameSaveError.set('No user context available.');
      return;
    }
    const updated = { ...u, name: this.displayForm.controls.name.value };
    this._user.set(updated);
    this.nameSaveSuccess.set('Display name saved.');
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
