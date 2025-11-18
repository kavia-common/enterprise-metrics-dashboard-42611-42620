import { Component, EventEmitter, Input, Output, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { Subscription } from 'rxjs';
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
    const rows = this.getCurrentRowsSnapshot();
    if (!rows.length) {
      try { console.warn('[HeaderBar] Export CSV requested but no rows available.'); } catch {}
      return;
    }

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
  }

  // PUBLIC_INTERFACE
  /**
   * Export current rows as JSON with UTF-8 BOM and .json extension.
   * Uses CsvExportService helper for robust SSR-safe download.
   */
  exportJson(): void {
    const rows = this.getCurrentRowsSnapshot();
    if (!rows.length) {
      try { console.warn('[HeaderBar] Export JSON requested but no rows available.'); } catch {}
      return;
    }
    this.csv.exportToJson(rows, { filename: this.buildFilename('json'), space: 2 });
    this.closeExport();
  }

  private getCurrentRowsSnapshot(): TableRow[] {
    // Prefer the bridge snapshot (published by table widget)
    const fromBridge = this.tableBridge.getSnapshot();
    if (Array.isArray(fromBridge) && fromBridge.length) {
      return fromBridge;
    }
    // Fallback: try to get last known dataset from MetricsService state via subscription one-shot (not ideal, but better than empty)
    // Note: MetricsService does not expose a snapshot; the table publishes rows after data load, so this branch is rarely hit.
    try { console.info('[HeaderBar] Falling back to empty dataset; table may not have published rows yet.'); } catch {}
    return [];
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
