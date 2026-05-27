<script lang="ts">
  import { Miosa } from "@miosa/sdk";
  import { createEventDispatcher } from "svelte";

  interface Props {
    sandboxId: string;
    apiKey: string;
  }

  let { sandboxId, apiKey }: Props = $props();

  const dispatch = createEventDispatcher<{ share: string }>();

  let loading = $state(false);
  let error = $state<Error | null>(null);
  let shareUrl = $state<string | null>(null);

  async function handleShare() {
    loading = true;
    error = null;
    try {
      const client = new Miosa({ apiKey });
      const sandbox = await client.sandboxes.get(sandboxId);
      const result = await (sandbox as any).previewToken(86400, "read");
      shareUrl = result.url;
      await navigator.clipboard.writeText(result.url).catch(() => undefined);
      dispatch("share", result.url);
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
    } finally {
      loading = false;
    }
  }
</script>

<div class="miosa-share">
  <button
    class="miosa-share__btn"
    disabled={loading}
    aria-busy={loading}
    aria-label="Share sandbox"
    onclick={handleShare}
  >
    {loading ? "Generating link…" : "Share"}
  </button>
  {#if shareUrl}
    <span class="miosa-share__url" role="status" aria-live="polite">{shareUrl}</span>
  {/if}
  {#if error}
    <span class="miosa-share__error" role="alert">{error.message}</span>
  {/if}
</div>

<style>
  .miosa-share {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: system-ui, sans-serif;
    font-size: 14px;
  }
  .miosa-share__btn {
    padding: 6px 16px;
    border-radius: 6px;
    background: #2563eb;
    color: #fff;
    border: none;
    cursor: pointer;
    font: inherit;
    font-weight: 500;
    transition: background 0.15s;
  }
  .miosa-share__btn:hover:not(:disabled) {
    background: #1d4ed8;
  }
  .miosa-share__btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .miosa-share__url {
    font-size: 12px;
    color: #888;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .miosa-share__error {
    color: #e05c5c;
    font-size: 12px;
  }
</style>
