import { Routes, provideRouter } from '@angular/router';
import { DashboardPageComponent } from './features/dashboard/dashboard.page';
import { ReportsPageComponent } from './features/reports/reports.page';
import { SettingsPageComponent } from './features/settings/settings.page';
import { LoginPageComponent } from './features/login/login.page';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', loadComponent: () => Promise.resolve(LoginPageComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => Promise.resolve(DashboardPageComponent) },
  { path: 'reports', canActivate: [authGuard], loadComponent: () => Promise.resolve(ReportsPageComponent) },
  { path: 'settings', canActivate: [authGuard], loadComponent: () => Promise.resolve(SettingsPageComponent) },
  { path: '**', redirectTo: 'dashboard' }
];
