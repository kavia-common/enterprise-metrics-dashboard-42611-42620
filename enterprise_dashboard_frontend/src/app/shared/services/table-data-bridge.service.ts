import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TableRow } from '../../core/services/metrics.service';

/**
 * PUBLIC_INTERFACE
 * TableDataBridgeService
 * A lightweight shared bridge where the table widget publishes its current displayed rows
 * (after any filter/sort), and other components (e.g., the header) can read them for export.
 * SSR-safe: no direct DOM access; purely in-memory state.
 */
@Injectable({ providedIn: 'root' })
export class TableDataBridgeService {
  private rows$ = new BehaviorSubject<TableRow[]>([]);

  /**
   * PUBLIC_INTERFACE
   * Publish the latest set of displayed rows from the table.
   */
  setRows(rows: TableRow[]): void {
    this.rows$.next(Array.isArray(rows) ? rows : []);
  }

  /**
   * PUBLIC_INTERFACE
   * Returns an observable of the current rows.
   */
  getRows$(): Observable<TableRow[]> {
    return this.rows$.asObservable();
  }

  /**
   * PUBLIC_INTERFACE
   * Returns the current rows snapshot.
   */
  getSnapshot(): TableRow[] {
    return this.rows$.value;
  }
}
