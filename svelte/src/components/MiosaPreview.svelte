<script lang="ts">
  import { Miosa } from "@miosa/sdk";
  import { onDestroy, onMount } from "svelte";

  interface Props {
    sandboxId: string;
    previewToken?: string;
    apiKey?: string;
    theme?: "light" | "dark";
    class?: string;
  }

  let {
    sandboxId,
    previewToken,
    apiKey,
    theme = "light",
    class: className = "",
  }: Props = $props();

  let iframeUrl = $state<string | null>(null);
  let loading = $state(true);
  let error = $state<Error | null>(null);

  interface ComponentEvents {
    error: Error;
  }

  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher<ComponentEvents>();

  async function resolveUrl() {
    loading = true;
    error = null;
    try {
      if (previewToken) {
        iframeUrl = `https://preview.miosa.app/${sandboxId}?token=${previewToken}`;
      } else if (apiKey) {
        const client = new Miosa({ apiKey });
        const sandbox = await client.sandboxes.get(sandboxId);
        const result = await (sandbox as any).previewToken(3600);
        iframeUrl = result.url;
      } else {
        throw new Error("Either previewToken or apiKey is required");
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      error = err;
      dispatch("error", err);
    } finally {
      loading = false;
    }
  }

  onMount(resolveUrl);

  $effect(() => {
    void sandboxId;
    resolveUrl();
  });

  onDestroy(() => {
    iframeUrl = null;
  });
</script>

<div
  class={`miosa-preview miosa-preview--${theme} ${className}`}
  role="region"
  aria-label="Sandbox preview"
>
  {#if loading}
    <div class="miosa-preview__loading" aria-live="polite">Loading preview…</div>
  {:else if error}
    <div class="miosa-preview__error" role="alert">{error.message}</div>
  {:else if iframeUrl}
    <iframe
      src={iframeUrl}
      class="miosa-preview__frame"
      sandbox="allow-scripts allow-same-origin allow-forms"
      allow="clipboard-read; clipboard-write"
      title="Sandbox preview"
    ></iframe>
  {/if}
</div>

<style>
  .miosa-preview {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 8px;
    background: #0d0d0d;
  }
  .miosa-preview--light {
    background: #f5f5f5;
  }
  .miosa-preview__frame {
    width: 100%;
    height: 100%;
    border: none;
  }
  .miosa-preview__loading,
  .miosa-preview__error {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    color: #888;
  }
  .miosa-preview__error {
    color: #e05c5c;
  }
</style>
