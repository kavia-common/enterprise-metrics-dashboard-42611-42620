import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricsService, TableRow } from '../../core/services/metrics.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-table-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-widget.component.html',
  styleUrls: ['./table-widget.component.css'],
})
export class TableWidgetComponent {
  title = 'Recent Invoices';
  loading = signal(true);
  error = signal<string | null>(null);
  rows = signal<TableRow[]>([]);

  constructor(private metrics: MetricsService) {
    this.metrics.getTableData().pipe(
      map((state) => {
        this.loading.set(state.loading);
        this.error.set(state.error ?? null);
        this.rows.set(state.data ?? []);
      })
    ).subscribe();
  }

  statusClass(s: string): string {
    switch (s) {
      case 'Paid': return 'chip chip-success';
      case 'Due': return 'chip chip-warning';
      case 'Overdue': return 'chip chip-danger';
      default: return 'chip';
    }
  }
}
