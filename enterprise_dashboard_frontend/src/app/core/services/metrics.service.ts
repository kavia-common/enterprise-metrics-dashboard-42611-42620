import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, timer } from 'rxjs';
import { catchError, delay, map, switchMap, tap } from 'rxjs/operators';
import { EnvConfigService } from './env-config.service';
import { ensureFetch } from '../../../polyfills-fetch';

export interface Kpi {
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'flat';
}
export interface ChartPoint {
  x: string | number | Date;
  y: number;
}
export interface TableRow {
  id: string;
  name: string;
  status: string;
  amount: number;
  date: string;
}

interface LoadState<T> {
  data: T | null;
  loading: boolean;
  error?: string | null;
}

/**
 * PUBLIC_INTERFACE
 * MetricsService
 * Fetches KPI, chart, and table data for dashboard widgets. Currently returns mock data with simulated latency.
 * Ready to switch to real endpoints by flipping the useMock flag.
 */
@Injectable({ providedIn: 'root' })
export class MetricsService {
  private readonly useMock = true; // Set to false to switch to real API when endpoints are ready.

  private kpiState$ = new BehaviorSubject<LoadState<Kpi[]>>({
    data: null,
    loading: false,
    error: null,
  });

  private chartState$ = new BehaviorSubject<LoadState<ChartPoint[]>>({
    data: null,
    loading: false,
    error: null,
  });

  private tableState$ = new BehaviorSubject<LoadState<TableRow[]>>({
    data: null,
    loading: false,
    error: null,
  });

  constructor(private env: EnvConfigService) {
    // Ensure global fetch exists in SSR/build contexts (fire and forget)
    try { void ensureFetch(); } catch { /* noop */ }
  }

  /**
   * PUBLIC_INTERFACE
   * Observable of KPIs with loading and error state managed internally.
   */
  getKpis(): Observable<LoadState<Kpi[]>> {
    this.loadKpis();
    return this.kpiState$.asObservable();
  }

  /**
   * PUBLIC_INTERFACE
   * Observable of chart data with loading and error state managed internally.
   */
  getChartData(): Observable<LoadState<ChartPoint[]>> {
    this.loadChart();
    return this.chartState$.asObservable();
  }

  /**
   * PUBLIC_INTERFACE
   * Observable of table data with loading and error state managed internally.
   */
  getTableData(): Observable<LoadState<TableRow[]>> {
    this.loadTable();
    return this.tableState$.asObservable();
  }

  private loadKpis(): void {
    if (this.kpiState$.value.loading) return;
    this.kpiState$.next({ data: this.kpiState$.value.data, loading: true, error: null });

    const req$ = this.useMock ? this.mockKpis() : this.fetchJson<Kpi[]>('/kpis');
    req$
      .pipe(
        tap((data) => this.kpiState$.next({ data, loading: false, error: null })),
        catchError((err) => {
          this.kpiState$.next({ data: null, loading: false, error: err?.message || 'Failed to load KPIs' });
          return of([] as Kpi[]);
        })
      )
      .subscribe();
  }

  private loadChart(): void {
    if (this.chartState$.value.loading) return;
    this.chartState$.next({ data: this.chartState$.value.data, loading: true, error: null });

    const req$ = this.useMock ? this.mockChart() : this.fetchJson<ChartPoint[]>('/charts/main');
    req$
      .pipe(
        tap((data) => this.chartState$.next({ data, loading: false, error: null })),
        catchError((err) => {
          this.chartState$.next({ data: null, loading: false, error: err?.message || 'Failed to load chart' });
          return of([] as ChartPoint[]);
        })
      )
      .subscribe();
  }

  private loadTable(): void {
    if (this.tableState$.value.loading) return;
    this.tableState$.next({ data: this.tableState$.value.data, loading: true, error: null });

    const req$ = this.useMock ? this.mockTable() : this.fetchJson<TableRow[]>('/records');
    req$
      .pipe(
        tap((data) => this.tableState$.next({ data, loading: false, error: null })),
        catchError((err) => {
          this.tableState$.next({ data: null, loading: false, error: err?.message || 'Failed to load table' });
          return of([] as TableRow[]);
        })
      )
      .subscribe();
  }

  private fetchJson<T>(path: string): Observable<T> {
    const base = this.env.getApiBaseUrl() || this.env.getBackendUrl();
    if (!base) {
      return throwError(() => new Error('API base URL is not configured.'));
    }
    return timer(300).pipe(
      switchMap(async () => {
        const f: any = (globalThis as any).fetch;
        if (typeof f !== 'function') {
          throw new Error('fetch is not available in this environment.');
        }
        const r = await f(this.normalizeUrl(base, path));
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as T;
      })
    );
  }

  private normalizeUrl(base: string, path: string): string {
    const b = base.endsWith('/') ? base.slice(0, -1) : base;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${b}${p}`;
  }

  // Mock data generators with small delay to simulate network
  private mockKpis(): Observable<Kpi[]> {
    const data: Kpi[] = [
      { label: 'Revenue', value: '$1.24M', trend: 'up' },
      { label: 'Orders', value: 842, trend: 'flat' },
      { label: 'Churn', value: '2.1%', trend: 'down' },
      { label: 'NPS', value: 62, trend: 'up' },
    ];
    return of(data).pipe(delay(350));
  }

  private mockChart(): Observable<ChartPoint[]> {
    const data: ChartPoint[] = Array.from({ length: 12 }).map((_, i) => ({
      x: `M${i + 1}`,
      y: Math.round(60 + Math.random() * 40),
    }));
    return of(data).pipe(delay(450));
  }

  private mockTable(): Observable<TableRow[]> {
    const rows: TableRow[] = [
      { id: 'INV-0001', name: 'Acme Corp', status: 'Paid', amount: 12990, date: '2025-10-01' },
      { id: 'INV-0002', name: 'Globex', status: 'Due', amount: 5090, date: '2025-10-04' },
      { id: 'INV-0003', name: 'Initech', status: 'Overdue', amount: 9300, date: '2025-10-07' },
      { id: 'INV-0004', name: 'Umbrella', status: 'Paid', amount: 3100, date: '2025-10-09' },
    ];
    return of(rows).pipe(delay(500));
  }
}
