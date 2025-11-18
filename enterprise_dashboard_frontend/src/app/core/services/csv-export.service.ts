import { Injectable } from '@angular/core';

/**
 * PUBLIC_INTERFACE
 * CsvExportService
 * Generates a CSV string from an array of objects with proper header generation, field escaping,
 * and includes UTF-8 BOM for Excel compatibility. Also triggers a download (browser environments only).
 *
 * SSR-safe: guards access to window/document/URL/Blob before use.
 */
@Injectable({ providedIn: 'root' })
export class CsvExportService {
  /**
   * PUBLIC_INTERFACE
   * Export the provided data array as a CSV file. If columns are provided, they define header order/labels.
   * - data: array of plain objects (e.g., rows from a table)
   * - columns: optional mapping to control order and labels of columns
   * - filename: suggested file name
   */
  exportToCsv(
    data: Array<Record<string, any>>,
    options?: {
      columns?: Array<{ key: string; header?: string }>;
      filename?: string;
    }
  ): void {
    const safeData = Array.isArray(data) ? data : [];
    const { columns, filename } = options ?? {};

    const cols = this.resolveColumns(safeData, columns);
    const headerRow = cols.map((c) => this.csvEscape(c.header ?? c.key)).join(',');

    const bodyRows = safeData.map((row) =>
      cols.map((c) => this.csvEscape(this.valueToString(row?.[c.key]))).join(',')
    );

    const csv = [headerRow, ...bodyRows].join('\r\n');

    // Prepend UTF-8 BOM for Excel compatibility
    const bom = '\uFEFF';
    const content = bom + csv;

    this.triggerDownload(content, filename || this.defaultFilename());
  }

  private resolveColumns(
    data: Array<Record<string, any>>,
    provided?: Array<{ key: string; header?: string }>
  ): Array<{ key: string; header?: string }> {
    if (provided && provided.length) return provided;
    // Infer columns from first row keys if not provided
    const first = data[0] ?? {};
    const keys = Object.keys(first);
    return keys.map((k) => ({ key: k, header: this.titleCase(k) }));
  }

  private titleCase(s: string): string {
    return s
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1));
  }

  private valueToString(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) {
      try {
        return v.toISOString();
      } catch {
        return String(v);
      }
    }
    if (typeof v === 'object') {
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    }
    return String(v);
  }

  private csvEscape(field: string): string {
    // Escape fields that contain: quote, comma, newline; double-up quotes per CSV standard
    if (field === undefined || field === null) return '';
    const needsQuotes = /[",\n\r]/.test(field);
    let escaped = field.replace(/"/g, '""');
    if (needsQuotes) {
      escaped = `"${escaped}"`;
    }
    return escaped;
  }

  private defaultFilename(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `metrics_export_${yyyy}-${mm}-${dd}.csv`;
  }

  private triggerDownload(content: string, filename: string): void {
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : ({} as any);
    const win: any = g.window;
    const doc: any = g.document;

    // SSR and environment guards using globalThis to satisfy linter and runtime
    const hasBlobCtor = !!(g && g.Blob);
    const hasURL = !!(win && (win.URL || (win as any).webkitURL));
    const hasSetTimeout = typeof g.setTimeout === 'function';

    if (!win || !doc || !hasURL || !hasBlobCtor) {
      // In SSR, just no-op
      return;
    }

    try {
      const blob = new g.Blob([content], { type: 'text/csv;charset=utf-8;' });
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
            try {
              doc.body.removeChild(link);
            } catch { /* ignore */ }
            try {
              if (url && (url as any).revokeObjectURL) {
                (url as any).revokeObjectURL(objectUrl);
              }
            } catch { /* ignore */ }
          }, 0);
        } else {
          // Fallback cleanup without timeout
          try {
            doc.body.removeChild(link);
          } catch { /* ignore */ }
          try {
            if (url && (url as any).revokeObjectURL) {
              (url as any).revokeObjectURL(objectUrl);
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      // Silent fail to avoid runtime errors in unusual environments
    }
  }
}
