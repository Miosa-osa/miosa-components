# @miosa/svelte Changelog

## 0.3.0 — 2026-05-27

### Added (Phase 6 — Admin Governance)
- `MiosaPolicyEditor` — Svelte 5 runes; collapsible policy categories; `$state<Set<string>>` open-sections tracking; live preview panel
- `MiosaMemberManager` — `$derived` filtered list; bind:value search + role filter; invite flow
- `MiosaWorkspaceManager` — imports sub-components directly; tabbed drill-in panel
- `MiosaUsageDashboard` — pure-SVG polyline charts; totals; top-N users table
- `MiosaAuditLog` — `$effect`-driven reactive reload on filter change; paginated; CSV export
- `MiosaActivityFeed` — `onDestroy` EventSource cleanup; `$derived` category filter
- `MiosaBulkActions` — `$derived` visibility; `onDestroy` clears poll timers; confirm dialogs
- `MiosaBrandingEditor` — style string interpolation for live preview
- `MiosaApiKeyManager` — reveal-once modal; L2 scoped mode; `window.navigator.clipboard`

### Fixed
- `MiosaTerminal`: typed `onData` / `onResize` callbacks to resolve `implicitly has an 'any' type` TS errors

## 0.2.0

Initial public release with sandbox management components.
