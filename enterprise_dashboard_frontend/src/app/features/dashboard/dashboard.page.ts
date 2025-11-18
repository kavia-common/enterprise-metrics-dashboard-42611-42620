import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartWidgetComponent } from '../../widgets/chart-widget/chart-widget.component';
import { TableWidgetComponent } from '../../widgets/table-widget/table-widget.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, ChartWidgetComponent, TableWidgetComponent],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.css'],
})
export class DashboardPageComponent {
  kpis = [
    { title: 'Revenue', value: '$1.24M', badge: '▲ 4.1%' },
    { title: 'Orders', value: '842', badge: '—' },
    { title: 'Churn', value: '2.1%', badge: '▼ 0.2%' },
    { title: 'NPS', value: '62', badge: '▲ 3' },
  ];
}
