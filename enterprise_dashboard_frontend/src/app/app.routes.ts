import { Routes } from '@angular/router';
import { DashboardPageComponent } from './features/dashboard/dashboard.page';
import { ReportsPageComponent } from './features/reports/reports.page';
import { SettingsPageComponent } from './features/settings/settings.page';
import { ProfilePageComponent } from './features/profile/profile.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadComponent: () => Promise.resolve(DashboardPageComponent) },
  { path: 'reports', loadComponent: () => Promise.resolve(ReportsPageComponent) },
  { path: 'settings', loadComponent: () => Promise.resolve(SettingsPageComponent) },
  { path: 'profile', loadComponent: () => Promise.resolve(ProfilePageComponent) },
  { path: '**', redirectTo: 'dashboard' }
];
