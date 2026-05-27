<script lang="ts">
  import { Miosa } from "@miosa/sdk";
  import { onMount } from "svelte";

  interface UsageData {
    compute_seconds: number;
    storage_gb_hours: number;
    egress_gb: number;
    period_start: string;
    period_end: string;
  }

  interface Props {
    externalUserId: string;
    apiKey: string;
    period?: "current" | "last_30" | "last_7";
    theme?: "light" | "dark";
  }

  let { externalUserId, apiKey, period = "current", theme = "light" }: Props = $props();

  let usage = $state<UsageData | null>(null);
  let loading = $state(true);
  let error = $state<Error | null>(null);

  async function loadUsage() {
    loading = true;
    error = null;
    try {
      const client = new Miosa({ apiKey });
      const result = await (client as any).usage.get({
        external_user_id: externalUserId,
        period,
      });
      usage = result?.data ?? result;
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
    } finally {
      loading = false;
    }
  }

  onMount(loadUsage);

  $effect(() => {
    void externalUserId;
    void period;
    loadUsage();
  });

  function fmt(n: number, unit: string) {
    return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;
  }
</script>

<div
  class={`miosa-usage miosa-usage--${theme}`}
  role="region"
  aria-label="Usage statistics"
>
  {#if loading}
    <div class="miosa-usage__state">Loading usage…</div>
  {:else if error}
    <div class="miosa-usage__state miosa-usage__state--error" role="alert">{error.message}</div>
  {:else if usage}
    <dl class="miosa-usage__list">
      <div class="miosa-usage__item">
        <dt>Compute</dt>
        <dd>{fmt(usage.compute_seconds, "sec")}</dd>
      </div>
      <div class="miosa-usage__item">
        <dt>Storage</dt>
        <dd>{fmt(usage.storage_gb_hours, "GB·hr")}</dd>
      </div>
      <div class="miosa-usage__item">
        <dt>Egress</dt>
        <dd>{fmt(usage.egress_gb, "GB")}</dd>
      </div>
    </dl>
  {:else}
    <div class="miosa-usage__state">No usage data.</div>
  {/if}
</div>

<style>
  .miosa-usage {
    font-family: system-ui, sans-serif;
    font-size: 14px;
    border-radius: 8px;
    padding: 16px;
    background: #111;
    color: #ccc;
  }
  .miosa-usage--light {
    background: #f9f9f9;
    color: #333;
  }
  .miosa-usage__state {
    color: #888;
  }
  .miosa-usage__state--error {
    color: #e05c5c;
  }
  .miosa-usage__list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin: 0;
  }
  .miosa-usage__item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .miosa-usage__item dt {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.6;
  }
  .miosa-usage__item dd {
    margin: 0;
    font-weight: 600;
    font-size: 16px;
  }
</style>
