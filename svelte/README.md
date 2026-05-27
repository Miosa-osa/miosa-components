# @miosa/svelte

Svelte 5 components for [MIOSA](https://miosa.ai) sandbox infrastructure.

## Install

```bash
npm install @miosa/svelte @miosa/sdk
# optional peer deps
npm install xterm xterm-addon-fit monaco-editor
```

## Components

### MiosaPreview

Embeds a live sandbox preview inside an `<iframe>`.

```svelte
<script lang="ts">
  import { MiosaPreview } from '@miosa/svelte'
</script>

<MiosaPreview
  sandboxId="sb-abc123"
  apiKey="mk_live_..."
  theme="dark"
  style="height: 400px"
  on:error={(e) => console.error(e.detail)}
/>
```

### MiosaTerminal

Renders an xterm.js terminal connected to the sandbox shell.

```svelte
<MiosaTerminal
  sandboxId="sb-abc123"
  apiKey="mk_live_..."
  theme="dark"
  on:resize={(e) => console.log(e.detail.cols, e.detail.rows)}
  on:error={(e) => console.error(e.detail)}
/>
```

### MiosaFileTree

Interactive file tree with live file-watch events.

```svelte
<MiosaFileTree
  sandboxId="sb-abc123"
  apiKey="mk_live_..."
  showHidden={false}
  defaultExpanded={true}
  on:select={(e) => openFile(e.detail)}
  on:change={(e) => reload()}
/>
```

### MiosaUsage

Usage stats for a given external user.

```svelte
<MiosaUsage
  externalUserId="user-123"
  apiKey="mk_live_..."
  period="current"
  theme="light"
/>
```

### MiosaShareButton

Mints a 24-hour preview token and copies the URL to clipboard.

```svelte
<MiosaShareButton
  sandboxId="sb-abc123"
  apiKey="mk_live_..."
  on:share={(e) => console.log('Shared:', e.detail)}
/>
```

## Store helper

```ts
import { createMiosaClient } from '@miosa/svelte'

const { client, mintPreviewToken } = createMiosaClient('mk_live_...')
const { url } = await mintPreviewToken('sb-abc123')
```

## Publish

```bash
pnpm build
pnpm publish --access public --no-git-checks
```
