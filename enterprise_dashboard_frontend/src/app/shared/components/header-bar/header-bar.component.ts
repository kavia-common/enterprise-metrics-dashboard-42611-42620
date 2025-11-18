import { Component, EventEmitter, Input, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { Subscription } from 'rxjs';

/**
 * PUBLIC_INTERFACE
 * HeaderBarComponent
 * Displays the top header with title, search input, theme toggle, and user action area.
 */
@Component({
  selector: 'app-header-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header-bar.component.html',
  styleUrls: ['./header-bar.component.css'],
})
export class HeaderBarComponent implements OnDestroy {
  @Input() title = 'Enterprise Dashboard';
  @Output() search = new EventEmitter<string>();

  // Simple display of current theme for toggle icon/label
  theme: 'light' | 'dark' = 'light';
  private sub?: Subscription;

  constructor(private themeService: ThemeService) {
    this.theme = this.themeService.getTheme();
    this.sub = this.themeService.themeChanges().subscribe((t) => (this.theme = t));
  }

  onSearch(term: string) {
    this.search.emit(term);
  }

  // PUBLIC_INTERFACE
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
