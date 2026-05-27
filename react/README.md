# @miosa/react

Drop-in React components for [MIOSA](https://miosa.ai) sandboxes. Paste one import, get a live terminal, preview iframe, file tree, usage chart, and share button — all wired to the MIOSA API.

**Drop into your app in 5 minutes →** see [Integration Guide](../../docs/integrations/whitelabel-saas.md)

---

## Install

```bash
pnpm add @miosa/react @miosa/sdk
# xterm peer dep (for MiosaTerminal)
pnpm add @xterm/xterm @xterm/addon-fit
# optional: Monaco editor (for MiosaCodeEditor)
pnpm add @monaco-editor/react
```

Import the stylesheet once at your app root:

```ts
import "@miosa/react/styles.css";
```

Or let `MiosaThemeProvider` inject it lazily:

```tsx
import { MiosaThemeProvider } from "@miosa/react";

<MiosaThemeProvider theme="dark" injectStyles>
  {children}
</MiosaThemeProvider>
```

---

## Components

### MiosaPreview

Renders the sandbox preview in an iframe. Pass a `previewToken` for browser-safe embeds; use `apiKey` only in server-rendered contexts.

```tsx
import { MiosaPreview } from "@miosa/react";

<MiosaPreview
  sandboxId="sb_abc123"
  previewToken="preview_tok_..."
  theme="dark"
  onError={(e) => console.error(e)}
/>
```

### MiosaTerminal

Full PTY terminal powered by xterm.js, connected to the sandbox via WebSocket.

```tsx
import { MiosaTerminal } from "@miosa/react";

<MiosaTerminal
  sandboxId="sb_abc123"
  apiKey={process.env.MIOSA_API_KEY}
  theme="dark"
  onResize={(cols, rows) => console.log(cols, rows)}
/>
```

### MiosaFileTree

Recursive file tree with live updates via the files watch API.

```tsx
import { MiosaFileTree } from "@miosa/react";
import type { FileNode } from "@miosa/react";

<MiosaFileTree
  sandboxId="sb_abc123"
  apiKey={process.env.MIOSA_API_KEY}
  onSelect={(file: FileNode) => openEditor(file.path)}
  defaultExpanded={["/workspace/src"]}
/>
```

### MiosaCodeEditor

Optional Monaco-based editor. Requires `@monaco-editor/react` — throws a descriptive error if not installed.

```tsx
import { MiosaCodeEditor } from "@miosa/react";

<MiosaCodeEditor
  file="src/index.ts"
  content={fileContent}
  onChange={(val) => save(val)}
  theme="dark"
/>
```

### MiosaUsage

SVG bar chart of sandbox usage for a given user and period.

```tsx
import { MiosaUsage } from "@miosa/react";

<MiosaUsage
  externalUserId="user_xyz"
  apiKey={process.env.MIOSA_API_KEY}
  period="30d"
/>
```

### MiosaShareButton

Generates a time-limited share URL and copies it to the clipboard.

```tsx
import { MiosaShareButton } from "@miosa/react";

<MiosaShareButton
  sandboxId="sb_abc123"
  apiKey={process.env.MIOSA_API_KEY}
  expiresIn={3600}
  onShare={(url) => toast(`Copied: ${url}`)}
/>
```

---

## Auth

Every component accepts either:

- `apiKey` — full access, use only in server-rendered or trusted contexts
- `previewToken` — read-only embed token, safe for browser code

---

## Theming

All components accept `theme="dark" | "light"`. CSS custom properties are scoped to `[data-miosa-theme]` so they never leak into the rest of your app.

Override any token:

```css
[data-miosa-theme="dark"] {
  --miosa-accent: #7c3aed;
  --miosa-bg: #0a0a0a;
}
```

---

## Publish

```bash
pnpm build
pnpm publish --access public
```

---

## License

MIT — MIOSA <hello@miosa.ai>
