# @miosa/react Changelog

## 0.3.0 — 2026-05-27

### Added (Phase 6 — Admin Governance)
- `MiosaPolicyEditor` — collapsible policy categories, inherited-value indicators, live effective-policy preview panel, calls `tenant.policy` / `tenant.setPolicy` / `workspaces.policy` / `workspaces.setPolicy`
- `MiosaMemberManager` — list, invite, change-role, and remove members across tenant or workspace scope; search and role-filter
- `MiosaWorkspaceManager` — list, create, and archive workspaces; drill-in panel embeds `MiosaPolicyEditor` and `MiosaMemberManager`
- `MiosaUsageDashboard` — pure-SVG line charts for sandbox-hours, storage, and credits over time; totals grid; top-N users table
- `MiosaAuditLog` — paginated event feed with expand-JSON and CSV export
- `MiosaActivityFeed` — SSE-based live event feed via `tenant.events.stream`; category filter chips; fade-in animation
- `MiosaBulkActions` — sticky selection bar; confirm dialogs; background job polling with `<progress>` indicator
- `MiosaBrandingEditor` — live preview of error page branding; calls `tenant.setBranding`
- `MiosaApiKeyManager` — list, create, revoke API keys; L2 scoped mode; reveal-once secret modal

## 0.2.0

Initial public release with sandbox management components.
