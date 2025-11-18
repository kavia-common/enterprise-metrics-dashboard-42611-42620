import { Component, EventEmitter, Input, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { Subscription } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { AuthService, AuthUser } from '../../../core/services/auth.service';

/**
 * PUBLIC_INTERFACE
 * HeaderBarComponent
 * Displays the top header with title, search input, theme toggle, and user action area.
 */
@Component({
  selector: 'app-header-bar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header-bar.component.html',
  styleUrls: ['./header-bar.component.css'],
})
export class HeaderBarComponent implements OnDestroy {
  @Input() title = 'Enterprise Dashboard';
  @Output() search = new EventEmitter<string>();

  // Simple display of current theme for toggle icon/label
  theme: 'light' | 'dark' = 'light';
  private sub?: Subscription;

  // Auth state
  user: AuthUser | null = null;

  constructor(private themeService: ThemeService, private auth: AuthService, private router: Router) {
    this.theme = this.themeService.getTheme();
    this.sub = this.themeService.themeChanges().subscribe((t) => (this.theme = t));
    // Auth subscription via signal snapshot
    this.user = this.auth.currentUser();
    // No native signal subscription here, keep it simple by polling changes when storage updates occur via constructor in AuthService
    // For UI updates on logout/login, we can re-check on navigation
    this.router.events.subscribe(() => {
      this.user = this.auth.currentUser();
    });
  }

  onSearch(term: string) {
    this.search.emit(term);
  }

  // PUBLIC_INTERFACE
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  // PUBLIC_INTERFACE
  logout() {
    this.auth.logout();
    this.user = null;
    this.router.navigateByUrl('/login');
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
