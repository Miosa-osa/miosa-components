# @miosa/vue

Vue 3 components for [MIOSA](https://miosa.ai) sandbox infrastructure.

## Install

```bash
npm install @miosa/vue @miosa/sdk
# optional peer deps
npm install xterm xterm-addon-fit monaco-editor
```

## Components

### MiosaPreview

Embeds a live sandbox preview inside an `<iframe>`.

```vue
<script setup lang="ts">
import { MiosaPreview } from '@miosa/vue'
</script>

<template>
  <MiosaPreview
    sandbox-id="sb-abc123"
    api-key="mk_live_..."
    theme="dark"
    style="height: 400px"
    @error="(e) => console.error(e)"
  />
</template>
```

### MiosaTerminal

Renders an xterm.js terminal connected to the sandbox shell.

```vue
<MiosaTerminal
  sandbox-id="sb-abc123"
  api-key="mk_live_..."
  theme="dark"
  @resize="(cols, rows) => console.log(cols, rows)"
  @error="(e) => console.error(e)"
/>
```

### MiosaFileTree

Interactive file tree with live file-watch events.

```vue
<MiosaFileTree
  sandbox-id="sb-abc123"
  api-key="mk_live_..."
  :show-hidden="false"
  :default-expanded="true"
  @select="(path) => openFile(path)"
  @change="(path, type) => reload()"
/>
```

### MiosaUsage

Usage stats for a given external user.

```vue
<MiosaUsage
  external-user-id="user-123"
  api-key="mk_live_..."
  period="current"
  theme="light"
/>
```

### MiosaShareButton

Mints a 24-hour preview token and copies the URL to clipboard.

```vue
<MiosaShareButton
  sandbox-id="sb-abc123"
  api-key="mk_live_..."
  @share="(url) => console.log('Shared:', url)"
/>
```

## Composable

```ts
import { useMiosaClient } from '@miosa/vue'

const { client, mintPreviewToken } = useMiosaClient('mk_live_...')
const { url } = await mintPreviewToken('sb-abc123')
```

## Publish

```bash
pnpm build
pnpm publish --access public --no-git-checks
```
