# Angular Enterprise Dashboard (Frontend)

Modern Angular 19 app implementing the "Ocean Professional" theme with a responsive layout:
- Left sidebar navigation
- Top header bar with search and user menu
- Main content area with a responsive grid for widgets (charts, tables)

## Running locally

```bash
ng serve
```

The dev server runs at `http://localhost:3000/` (configured in `angular.json`). Hot reload is enabled.

## Routes

- `/dashboard` (default): KPI cards, a chart widget and a table widget (mock data)
- `/reports`: Placeholder page for reports
- `/settings`: Placeholder page for settings

## Theming

Theme variables are defined in `src/styles.css` as CSS variables:

- `--primary: #2563EB`
- `--secondary / --success: #F59E0B`
- `--error: #EF4444`
- `--bg: #f9fafb`, `--surface: #ffffff`
- `--text: #111827`

These are applied throughout components along with shadows, rounded corners, and gradient accents.

## Environment configuration

Environment values are read via `process.env` with the `NG_APP_*` prefix:

- `NG_APP_API_BASE`
- `NG_APP_BACKEND_URL`
- `NG_APP_WS_URL`

`EnvConfigService` centralizes access to these values. Current implementation uses mock data by default in `MetricsService`. To switch to real APIs, set `useMock = false` and ensure `NG_APP_API_BASE` or `NG_APP_BACKEND_URL` is configured in your environment.

Note: The CI/build environment should make `process.env.NG_APP_*` available at build time. No new env vars were introduced.

## Widgets

- `ChartWidgetComponent`: Simple SVG area/line placeholder using mock time-series data.
- `TableWidgetComponent`: Accessible grid-like table with status chips and responsive layout.

Both widgets display loading and error states and consume data from `MetricsService` (which uses a lightweight `BehaviorSubject` state).

### Extending widgets

- Create a new component under `src/app/widgets/<your-widget>/`.
- Inject `MetricsService` (or another dedicated service) to fetch data.
- Show loading/error states similarly to existing widgets.
- Add your widget to any page’s grid (e.g., `DashboardPage`).

## Structure

- `src/app/shared/components/`: `HeaderBar`, `Sidebar`
- `src/app/features/`: `dashboard`, `reports`, `settings`
- `src/app/widgets/`: `chart-widget`, `table-widget`
- `src/app/core/services/`: `env-config.service.ts`, `metrics.service.ts`

