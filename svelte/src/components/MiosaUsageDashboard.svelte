<script lang="ts">
  import { Miosa } from "@miosa/sdk";
  import { onMount } from "svelte";

  type UsageScope = "tenant" | "workspace" | "user";
  interface UsageBucket { label: string; sandbox_hours: number; storage_gb_hours: number; credits: number; }
  interface TopUser { id: string; email?: string; sandbox_hours: number; credits: number; }
  interface UsageData { buckets: UsageBucket[]; top_users: TopUser[]; totals: { sandbox_hours: number; storage_gb_hours: number; credits: number }; }

  interface Props {
    scope: UsageScope;
    id?: string;
    apiKey: string;
    period?: "7d" | "30d" | "90d";
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
    class?: string;
    style?: string;
  }

  let { scope, id, apiKey, period = "30d", theme = "dark", unstyled = false, onError, class: className, style }: Props = $props();

  let data = $state<UsageData | null>(null);
  let loading = $state(true);
  let error = $state<Error | null>(null);

  function linePoints(buckets: UsageBucket[], field: keyof Omit<UsageBucket, "label">): string {
    const W = 300, H = 80, pad = 8;
    const vals = buckets.map((b) => b[field] as number);
    const max = Math.max(...vals, 1);
    return vals.map((v, i) => {
      const x = pad + (i / Math.max(vals.length - 1, 1)) * (W - pad * 2);
      const y = H - pad - (v / max) * (H - pad * 2);
      return `${x},${y}`;
    }).join(" ");
  }

  async function load() {
    loading = true; error = null;
    try {
      const client = new Miosa({ apiKey });
      const params: Record<string, unknown> = { period };
      if (scope === "workspace" && id) params["workspace_id"] = id;
      if (scope === "user" && id) params["external_user_id"] = id;
      const raw = await (client as any).usage.get(params);
      data = raw as UsageData;
    } catch (e) { error = e instanceof Error ? e : new Error(String(e)); onError?.(error); }
    finally { loading = false; }
  }

  onMount(load);
  $effect(() => { void scope; void id; void apiKey; void period; load(); });
</script>

<div class={[!unstyled && "miosa-ud", !unstyled && `miosa-ud--${theme}`, className].filter(Boolean).join(" ")} {style} data-miosa-theme={theme}>
  {#if loading}
    <div class="miosa-ud__skeleton" aria-busy="true" aria-label="Loading usage dashboard"></div>
  {:else if error}
    <div role="alert">{error.message}</div>
  {:else if data}
    <div class="miosa-ud__totals">
      <div class="miosa-ud__total-card"><span class="miosa-ud__total-label">Sandbox Hours</span><span class="miosa-ud__total-val">{data.totals.sandbox_hours.toLocaleString()} hrs</span></div>
      <div class="miosa-ud__total-card"><span class="miosa-ud__total-label">Storage GB·hr</span><span class="miosa-ud__total-val">{data.totals.storage_gb_hours.toLocaleString()} GB·hr</span></div>
      <div class="miosa-ud__total-card"><span class="miosa-ud__total-label">Credits</span><span class="miosa-ud__total-val">{data.totals.credits.toLocaleString()} cr</span></div>
    </div>
    {#if data.buckets.length > 0}
      <div class="miosa-ud__charts">
        {#each [["Sandbox hours","sandbox_hours","var(--miosa-accent,#4f8ef7)"],["Storage GB·hr","storage_gb_hours","var(--miosa-success,#34d399)"],["Credits","credits","var(--miosa-error,#f87171)"]] as [label, field, color]}
          <div class="miosa-ud__chart">
            <span class="miosa-ud__chart-label">{label}</span>
            <svg viewBox="0 0 300 80" class="miosa-ud__chart-svg" aria-label="{label} over time" role="img" preserveAspectRatio="none">
              <polyline points={linePoints(data.buckets, field as keyof Omit<UsageBucket,"label">)} fill="none" stroke={color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
            </svg>
          </div>
        {/each}
      </div>
    {/if}
    {#if data.top_users.length > 0}
      <div class="miosa-ud__top-users">
        <h3 class="miosa-ud__section-title">Top users</h3>
        <table class="miosa-ud__table" aria-label="Top users by usage">
          <thead><tr><th>User</th><th>Sandbox hrs</th><th>Credits</th></tr></thead>
          <tbody>
            {#each data.top_users as u (u.id)}
              <tr><td>{u.email ?? u.id}</td><td>{u.sandbox_hours.toLocaleString()}</td><td>{u.credits.toLocaleString()}</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>
