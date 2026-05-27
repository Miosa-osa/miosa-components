# MIOSA Components

Drop-in UI components for embedding MIOSA in your white-label product.

## Three framework packages, one repo

| Package | Subdirectory | Install |
|---|---|---|
| `@miosa/react` | [react/](./react) | `npm install @miosa/react` |
| `@miosa/vue` | [vue/](./vue) | `npm install @miosa/vue` |
| `@miosa/svelte` | [svelte/](./svelte) | `npm install @miosa/svelte` |

All three publish v0.3.0 with the Phase 6 governance components:

- `<MiosaPreview>` — iframe wrapper with auto-mint preview token
- `<MiosaTerminal>` — xterm.js terminal
- `<MiosaFileTree>` — recursive file explorer with watch SSE
- `<MiosaUsage>` — per-user usage badge
- `<PolicyEditor>` — three-tier policy CRUD UI
- `<MemberManager>` — workspace/external member management
- `<WorkspaceManager>` — workspace switcher with RBAC
- `<UsageDashboard>` — per-user metrics
- `<AuditLog>` — paginated audit feed
- `<ActivityFeed>` — real-time admin events via SSE
- `<BulkActions>` — bulk operations panel
- `<BrandingEditor>` — tenant branding editor
- `<ApiKeyManager>` — scoped key CRUD

## Docs

https://miosa.ai/docs/ui-components

## License

MIT
