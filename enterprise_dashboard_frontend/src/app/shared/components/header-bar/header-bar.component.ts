import { Component, EventEmitter, Input, Output, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { Subscription } from 'rxjs';
import { CsvExportService } from '../../../core/services/csv-export.service';
import { TableDataBridgeService } from '../../services/table-data-bridge.service';

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
    private tableBridge: TableDataBridgeService
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
  onDocClick(): void {
    if (this.exportOpen) {
      this.exportOpen = false;
    }
  }

  // PUBLIC_INTERFACE
  exportCsv(): void {
    const rows = this.tableBridge.getSnapshot();
    if (!rows || rows.length === 0) return;

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
   * SSR-safe with globalThis guards similar to CsvExportService.
   */
  exportJson(): void {
    const rows = this.tableBridge.getSnapshot();
    if (!rows || rows.length === 0) return;

    let json = '';
    try {
      json = JSON.stringify(rows, null, 2);
    } catch {
      // On circular structure or unexpected error, fallback to shallow string conversion
      json = String(rows as any);
    }

    // Prepend BOM for UTF-8
    const content = '﻿' + json;
    this.triggerDownload(content, this.buildFilename('json'), 'application/json;charset=utf-8;');
    this.closeExport();
  }

  private buildFilename(ext: 'csv' | 'json'): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `metrics_export_${yyyy}-${mm}-${dd}.${ext}`;
  }

  private triggerDownload(content: string, filename: string, mime: string): void {
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : ({} as any);
    const win: any = g.window;
    const doc: any = g.document;

    const hasBlobCtor = !!(g && g.Blob);
    const hasURL = !!(win && (win.URL || (win as any).webkitURL));
    const hasSetTimeout = typeof g.setTimeout === 'function';

    if (!win || !doc || !hasURL || !hasBlobCtor) {
      return; // SSR or unsupported
    }
    try {
      const blob = new g.Blob([content], { type: mime });
      const url = (win.URL || (win as any).webkitURL) as any;
      const link = doc.createElement('a');
      const objectUrl = (url && (url as any).createObjectURL ? (url as any).createObjectURL(blob) : null) as string | null;

      if (link && objectUrl) {
        link.href = objectUrl;
        link.setAttribute('download', filename);
        link.style.display = 'none';
        doc.body.appendChild(link);
        link.click();
        if (hasSetTimeout) {
          g.setTimeout(() => {
            try { doc.body.removeChild(link); } catch {}
            try {
              if (url && (url as any).revokeObjectURL) {
                (url as any).revokeObjectURL(objectUrl);
              }
            } catch {}
          }, 0);
        } else {
          try { doc.body.removeChild(link); } catch {}
          try {
            if (url && (url as any).revokeObjectURL) {
              (url as any).revokeObjectURL(objectUrl);
            }
          } catch {}
        }
      }
    } catch {
      // Silent fail
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.bridgeSub?.unsubscribe();
  }
}
