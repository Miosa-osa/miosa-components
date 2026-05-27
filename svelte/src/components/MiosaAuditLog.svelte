<script lang="ts">
  import { Miosa } from "@miosa/sdk";

  interface AuditEvent { id: string; ts: string; type: string; actor: string; resource: string; data: Record<string, unknown>; }
  interface Page { events: AuditEvent[]; next_cursor?: string; }
  interface AuditSdk { audit_log: { list: (p: Record<string, unknown>) => Promise<unknown> } }

  interface Props {
    scope?: "tenant" | "workspace" | "user";
    scopeId?: string;
    apiKey: string;
    pageSize?: number;
    filters?: { action?: string; actor?: string; resource?: string };
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
    class?: string;
    style?: string;
  }

  let { scope, scopeId, apiKey, pageSize = 25, filters, theme = "dark", unstyled = false, onError, class: className, style }: Props = $props();

  function asApi(key: string): AuditSdk { return new Miosa({ apiKey: key }) as unknown as AuditSdk; }

  let events = $state<AuditEvent[]>([]);
  let loading = $state(true);
  let error = $state<Error | null>(null);
  let cursor = $state<string | undefined>(undefined);
  let expandedId = $state<string | null>(null);
  let filterAction = $state(filters?.action ?? "");
  let filterActor = $state(filters?.actor ?? "");
  let filterResource = $state(filters?.resource ?? "");

  async function load(nextCursor?: string) {
    if (!nextCursor) { loading = true; events = []; }
    error = null;
    try {
      const params: Record<string, unknown> = { limit: pageSize };
      if (filterAction) params["action"] = filterAction;
      if (filterActor) params["actor"] = filterActor;
      if (filterResource) params["resource"] = filterResource;
      if (nextCursor) params["cursor"] = nextCursor;
      if (scope === "workspace" && scopeId) params["filter[workspace_id]"] = scopeId;
      if (scope === "user" && scopeId) params["filter[external_user_id]"] = scopeId;
      const raw = await asApi(apiKey).audit_log.list(params);
      const page = raw as Page;
      events = [...events, ...(page.events ?? [])];
      cursor = page.next_cursor;
    } catch (e) { error = e instanceof Error ? e : new Error(String(e)); onError?.(error); }
    finally { loading = false; }
  }

  function downloadCsv() {
    const header = "id,ts,type,actor,resource\n";
    const rows = events.map((e) => `${e.id},${e.ts},${JSON.stringify(e.type)},${JSON.stringify(e.actor)},${JSON.stringify(e.resource)}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "audit-log.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  $effect(() => { void scope; void scopeId; void apiKey; void filterAction; void filterActor; void filterResource; cursor = undefined; load(); });
</script>

<div class={[!unstyled && "miosa-al", !unstyled && `miosa-al--${theme}`, className].filter(Boolean).join(" ")} {style} data-miosa-theme={theme}>
  <div class="miosa-al__filters">
    <input type="text" class="miosa-al__input" placeholder="Action type" aria-label="Action type" bind:value={filterAction} />
    <input type="text" class="miosa-al__input" placeholder="Actor" aria-label="Actor" bind:value={filterActor} />
    <input type="text" class="miosa-al__input" placeholder="Resource" aria-label="Resource" bind:value={filterResource} />
    <button type="button" class="miosa-al__export-btn" disabled={loading} aria-label="Export CSV" onclick={downloadCsv}>Export CSV</button>
  </div>

  {#if loading}
    <div class="miosa-al__loading" aria-busy="true">Loading audit log…</div>
  {:else if error}
    <div class="miosa-al__error" role="alert">{error.message}</div>
  {:else}
    <ul class="miosa-al__list" role="list" aria-label="Audit events">
      {#each events as ev (ev.id)}
        <li class="miosa-al__item">
          <button type="button" class="miosa-al__item-summary" aria-expanded={expandedId === ev.id} aria-label={`Event ${ev.type}`}
            onclick={() => expandedId = expandedId === ev.id ? null : ev.id}>
            <span class="miosa-al__event-type">{ev.type}</span>
            <span class="miosa-al__event-actor">{ev.actor}</span>
            <span class="miosa-al__event-resource">{ev.resource}</span>
            <span class="miosa-al__event-ts">{new Date(ev.ts).toLocaleString()}</span>
          </button>
          {#if expandedId === ev.id}
            <pre class="miosa-al__item-json">{JSON.stringify(ev.data, null, 2)}</pre>
          {/if}
        </li>
      {/each}
      {#if events.length === 0}<li class="miosa-al__empty">No events found.</li>{/if}
    </ul>
    {#if cursor}
      <button type="button" class="miosa-al__load-more" aria-label="Load more events" onclick={() => load(cursor)}>Load more</button>
    {/if}
  {/if}
</div>
