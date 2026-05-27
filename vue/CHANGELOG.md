# @miosa/vue Changelog

## 0.3.0 — 2026-05-27

### Added (Phase 6 — Admin Governance)
- `MiosaPolicyEditor` — collapsible policy categories, inherited-value indicators, live effective-policy preview panel
- `MiosaMemberManager` — list, invite, change-role, and remove members; search and role-filter
- `MiosaWorkspaceManager` — list, create, archive workspaces; drill-in panel embeds policy and member management
- `MiosaUsageDashboard` — pure-SVG line charts (no external chart lib); totals grid; top-N users table
- `MiosaAuditLog` — paginated event feed with expand-JSON and CSV export
- `MiosaActivityFeed` — SSE-based live event feed; category filter chips; fade-in animation
- `MiosaBulkActions` — sticky selection bar; confirm dialogs; job polling with `<progress>`
- `MiosaBrandingEditor` — live branding preview; calls `tenant.setBranding`
- `MiosaApiKeyManager` — list, create, revoke keys; L2 scoped mode; reveal-once secret modal

### Fixed
- `MiosaApiKeyManager`: `window.navigator.clipboard.writeText()` instead of bare `navigator` for strict TS compatibility

## 0.2.0

Initial public release with sandbox management components.
