import { Component, EventEmitter, Input, Output, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { Subscription, firstValueFrom, take } from 'rxjs';
import { CsvExportService } from '../../../core/services/csv-export.service';
import { TableDataBridgeService } from '../../services/table-data-bridge.service';
import { MetricsService, TableRow } from '../../../core/services/metrics.service';

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

  theme: 'light' | 'dark' = 'light';
  private sub?: Subscription;

  exportOpen = false;
  hasRows = false;

  private bridgeSub?: Subscription;

  constructor(
    private themeService: ThemeService,
    private csv: CsvExportService,
    private tableBridge: TableDataBridgeService,
    private hostRef: ElementRef<HTMLElement>,
    private metrics: MetricsService
  ) {
    this.theme = this.themeService.getTheme();
    this.sub = this.themeService.themeChanges().subscribe((t) => (this.theme = t));

    // Track if there are rows available for export
    this.bridgeSub = this.tableBridge.getRows$().subscribe(rows => {
      this.hasRows = Array.isArray(rows) && rows.length > 0;
    });
  }

  onSearch(term: string) {
    this.search.emit(term);
  }

  // PUBLIC_INTERFACE
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleExportMenu(): void {
    this.exportOpen = !this.exportOpen;
  }
  closeExport(): void {
    this.exportOpen = false;
  }

  // Close on outside click (browser only; host listener is safe in Angular SSR)
  @HostListener('document:click', ['$event'])
  onDocClick(ev: any): void {
    if (!this.exportOpen) return;
    try {
      // Close only if click is outside this component root
      const root: any = this.hostRef?.nativeElement;
      const target: any = ev?.target;
      const contains = root && target && typeof root.contains === 'function' ? root.contains(target) : false;
      if (!contains) {
        this.exportOpen = false;
      }
    } catch {
      // Fallback: close
      this.exportOpen = false;
    }
  }

  // PUBLIC_INTERFACE
  exportCsv(): void {
    try { console.debug('[HeaderBar] exportCsv() clicked'); } catch {}
    const rows = this.getCurrentRowsSnapshot();
    if (!rows.length) {
      try { console.warn('[HeaderBar] Export CSV requested but no rows available. Attempting immediate fallback.'); } catch {}
      // Attempt a quick one-shot pull from MetricsService observable as a last resort
      this.tryFetchRowsOnce().then(fallbackRows => {
        if (!fallbackRows.length) {
          try { console.error('[HeaderBar] No data available for CSV export.'); } catch {}
          return;
        }
        this.doCsvExport(fallbackRows);
      }).catch(() => {
        try { console.error('[HeaderBar] Fallback fetch failed; no data to export.'); } catch {}
      });
      return;
    }

    this.doCsvExport(rows);
  }

  private doCsvExport(rows: TableRow[]): void {
    this.csv.exportToCsv(rows, {
      filename: this.buildFilename('csv'),
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Client' },
        { key: 'status', header: 'Status' },
        { key: 'amount', header: 'Amount' },
        { key: 'date', header: 'Date' },
      ],
    });
    this.closeExport();
    try { console.info('[HeaderBar] CSV download triggered. Rows:', rows.length); } catch {}
  }

  // PUBLIC_INTERFACE
  /**
   * Export current rows as JSON with UTF-8 BOM and .json extension.
   * Uses CsvExportService helper for robust SSR-safe download.
   */
  exportJson(): void {
    try { console.debug('[HeaderBar] exportJson() clicked'); } catch {}
    const rows = this.getCurrentRowsSnapshot();
    if (!rows.length) {
      try { console.warn('[HeaderBar] Export JSON requested but no rows available. Attempting immediate fallback.'); } catch {}
      this.tryFetchRowsOnce().then(fallbackRows => {
        if (!fallbackRows.length) {
          try { console.error('[HeaderBar] No data available for JSON export.'); } catch {}
          return;
        }
        this.doJsonExport(fallbackRows);
      }).catch(() => {
        try { console.error('[HeaderBar] Fallback fetch failed; no data to export.'); } catch {}
      });
      return;
    }
    this.doJsonExport(rows);
  }

  private doJsonExport(rows: TableRow[]): void {
    this.csv.exportToJson(rows, { filename: this.buildFilename('json'), space: 2 });
    this.closeExport();
    try { console.info('[HeaderBar] JSON download triggered. Rows:', rows.length); } catch {}
  }

  private getCurrentRowsSnapshot(): TableRow[] {
    // Prefer the bridge snapshot (published by table widget)
    const fromBridge = this.tableBridge.getSnapshot();
    if (Array.isArray(fromBridge) && fromBridge.length) {
      return fromBridge;
    }
    try { console.info('[HeaderBar] Bridge has no rows snapshot yet.'); } catch {}
    return [];
  }

  /**
   * Try to obtain rows quickly by tapping the MetricsService table observable once.
   * This is a best-effort fallback to reduce cases where export is clicked right before
   * the table publishes into the bridge.
   */
  private async tryFetchRowsOnce(): Promise<TableRow[]> {
    try {
      const state = await firstValueFrom(this.metrics.getTableData().pipe(take(1)));
      const data = state?.data ?? [];
      // Also publish to bridge so subsequent clicks see rows
      if (Array.isArray(data)) {
        this.tableBridge.setRows(data);
      }
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  private buildFilename(ext: 'csv' | 'json'): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `metrics_export_${yyyy}-${mm}-${dd}.${ext}`;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.bridgeSub?.unsubscribe();
  }
}
