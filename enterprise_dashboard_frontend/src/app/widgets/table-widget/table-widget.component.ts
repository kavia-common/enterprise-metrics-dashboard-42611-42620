import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricsService, TableRow } from '../../core/services/metrics.service';
import { map } from 'rxjs/operators';
import { CsvExportService } from '../../core/services/csv-export.service';
import { TableDataBridgeService } from '../../shared/services/table-data-bridge.service';

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

  constructor(
    private metrics: MetricsService,
    private csv: CsvExportService,
    private tableBridge: TableDataBridgeService
  ) {
    this.metrics.getTableData().pipe(
      map((state) => {
        this.loading.set(state.loading);
        this.error.set(state.error ?? null);
        const data = state.data ?? [];
        this.rows.set(data);
        // Publish to bridge so header can export current displayed rows
        this.tableBridge.setRows(data);
        // Minimal runtime logging guard to aid debugging, including positive confirmation
        try {
          if (!data.length) {
            console.info('[TableWidget] No table rows loaded to publish yet.');
          } else {
            console.debug('[TableWidget] Published rows to bridge:', data.length);
          }
        } catch {}
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

  // PUBLIC_INTERFACE
  /**
   * Export current dataset as CSV. Uses displayed rows (could be filtered/sorted in future).
   * SSR-safe: CsvExportService handles environment checks before triggering a download.
   */
  exportCsv(): void {
    const data = this.rows() ?? [];
    if (!data.length) return;

    this.csv.exportToCsv(data, {
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Client' },
        { key: 'status', header: 'Status' },
        { key: 'amount', header: 'Amount' },
        { key: 'date', header: 'Date' },
      ],
      filename: this.buildFilename(),
    });
  }

  private buildFilename(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `metrics_export_${yyyy}-${mm}-${dd}.csv`;
  }
}
