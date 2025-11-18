import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * PUBLIC_INTERFACE
 * HeaderBarComponent
 * Displays the top header with title, search input, and user action area.
 */
@Component({
  selector: 'app-header-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header-bar.component.html',
  styleUrls: ['./header-bar.component.css'],
})
export class HeaderBarComponent {
  @Input() title = 'Enterprise Dashboard';
  @Output() search = new EventEmitter<string>();

  onSearch(term: string) {
    this.search.emit(term);
  }
}
