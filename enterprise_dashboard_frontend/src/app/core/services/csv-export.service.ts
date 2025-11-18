import { Injectable } from '@angular/core';

/**
 * PUBLIC_INTERFACE
 * CsvExportService
 * Generates CSV or JSON strings and triggers downloads in browser with SSR-safe guards.
 * - CSV: proper header ordering, field escaping, UTF-8 BOM, correct MIME.
 * - JSON: pretty-printed, UTF-8 BOM, correct MIME.
 *
 * Centralized robust download helper:
 *   1) Prefer Blob + URL.createObjectURL + temporary <a> + revokeObjectURL
 *   2) Fallback to data: URLs with base64 when Blob/URL unavailable
 *   3) SSR-safe guards for window/document
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

    this.triggerDownload(content, filename || this.defaultFilename('csv'), 'text/csv;charset=utf-8');
  }

  // PUBLIC_INTERFACE
  /**
   * Export the provided data array as a JSON file with UTF-8 BOM and pretty printed content.
   */
  exportToJson(
    data: Array<Record<string, any>>,
    options?: {
      filename?: string;
      space?: number;
    }
  ): void {
    let json = '';
    try {
      json = JSON.stringify(Array.isArray(data) ? data : [], null, options?.space ?? 2);
    } catch (e) {
      try { console.warn('[CsvExportService] Failed to stringify JSON for export:', e); } catch {}
      json = String(data as any);
    }
    // Prepend UTF-8 BOM
    const content = '\uFEFF' + json;
    this.triggerDownload(content, options?.filename || this.defaultFilename('json'), 'application/json;charset=utf-8');
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

  private defaultFilename(ext: 'csv' | 'json'): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `metrics_export_${yyyy}-${mm}-${dd}.${ext}`;
  }

  /**
   * Robust SSR-safe download helper:
   * - Checks for Blob and URL support
   * - Creates object URL and a temporary anchor
   * - Appends to DOM, clicks, then removes and revokes the URL
   * - Falls back to data: URL (base64) when Blob/URL is unavailable
   */
  private triggerDownload(content: string, filename: string, mime: string): void {
    const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : ({} as any);
    const win: any = g.window;
    const doc: any = g.document;

    const hasBlobCtor = !!(g && g.Blob);
    const hasURL = !!(win && (win.URL || (win as any).webkitURL));
    const hasSetTimeout = typeof g.setTimeout === 'function';

    if (!win || !doc) {
      try { console.warn('[CsvExportService] Download not supported (no window/document, SSR).'); } catch {}
      return;
    }

    // Prefer Blob URL path for reliability and large files
    if (hasBlobCtor && hasURL) {
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
          try { console.debug('[CsvExportService] Blob URL download path used.'); } catch {}
          return;
        }
      } catch (e) {
        try { console.warn('[CsvExportService] Blob URL download failed, attempting data URL fallback.', e); } catch {}
      }
    }

    // Fallback: data URL with base64 to avoid charset issues with non-ASCII content
    try {
      const link = doc.createElement('a');
      let base64 = '';
      try {
        base64 = g.btoa(unescape(encodeURIComponent(content)));
      } catch {
        // If encodeURIComponent/unescape not available or fails, try direct btoa
        try { base64 = g.btoa(content); } catch { base64 = ''; }
      }
      if (!base64) {
        // As a last resort, fall back to simple URL-encoded data URL
        const encoded = encodeURIComponent(content);
        link.href = `data:${mime},${encoded}`;
      } else {
        link.href = `data:${mime};base64,${base64}`;
      }
      link.setAttribute('download', filename);
      link.style.display = 'none';
      doc.body.appendChild(link);
      link.click();
      try { doc.body.removeChild(link); } catch {}
      try { console.debug('[CsvExportService] Data URL fallback path used.'); } catch {}
    } catch (e) {
      try { console.error('[CsvExportService] Failed to trigger download via fallback.', e); } catch {}
    }
  }
}
