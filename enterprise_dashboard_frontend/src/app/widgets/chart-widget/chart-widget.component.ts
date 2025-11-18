import { Component, computed, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricsService, ChartPoint } from '../../core/services/metrics.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-chart-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chart-widget.component.html',
  styleUrls: ['./chart-widget.component.css'],
})
export class ChartWidgetComponent {
  title = 'Performance';
  loading = signal(true);
  error = signal<string | null>(null);
  data = signal<ChartPoint[]>([]);

  constructor(private metrics: MetricsService) {
    this.metrics.getChartData().pipe(
      map((state) => {
        this.loading.set(state.loading);
        this.error.set(state.error ?? null);
        this.data.set(state.data ?? []);
      })
    ).subscribe();
  }

  // Generate points for simple SVG polyline
  points(): string {
    const d = this.data();
    if (!d.length) return '';
    const w = 500;
    const h = 180;
    const max = Math.max(...d.map(p => p.y), 1);
    const step = w / (d.length - 1);
    return d.map((p, i) => `${i * step},${h - (p.y / max) * (h - 20)}`).join(' ');
  }
}
