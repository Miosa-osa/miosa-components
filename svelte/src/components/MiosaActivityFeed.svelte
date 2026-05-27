<script lang="ts">
  import { Miosa } from "@miosa/sdk";
  import { onMount, onDestroy } from "svelte";

  interface FeedEvent { id: string; ts: string; type: string; actor?: string; resource?: string; }
  const EVENT_CATEGORIES = ["sandbox","member","policy","quota","workspace"] as const;
  type EventCategory = (typeof EVENT_CATEGORIES)[number];

  interface Props {
    scope?: string;
    apiKey: string;
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
    class?: string;
    style?: string;
  }

  let { scope, apiKey, theme = "dark", unstyled = false, onError, class: className, style }: Props = $props();

  let events = $state<FeedEvent[]>([]);
  let connected = $state(false);
  let activeCategories = $state<Set<EventCategory | "other">>(new Set());
  let newIds = $state<Set<string>>(new Set());
  let es: EventSource | null = null;

  function categoryOf(type: string): EventCategory | "other" {
    for (const cat of EVENT_CATEGORIES) { if (type.startsWith(cat + ".")) return cat; }
    return "other";
  }

  function toggleCategory(cat: EventCategory | "other") {
    const s = new Set(activeCategories);
    if (s.has(cat)) s.delete(cat); else s.add(cat);
    activeCategories = s;
  }

  const filtered = $derived(
    activeCategories.size === 0 ? events : events.filter((ev) => activeCategories.has(categoryOf(ev.type)))
  );

  onMount(() => {
    interface StreamSdk { tenant: { events: { stream: (p: { types: string[]; scope?: string }) => EventSource } } }
    const c = new Miosa({ apiKey }) as unknown as StreamSdk;
    if (!c.tenant?.events?.stream) return;
    es = c.tenant.events.stream({ types: ["*"], scope: scope ?? "all" });
    es.onopen = () => { connected = true; };
    es.onerror = () => { connected = false; onError?.(new Error("Activity feed disconnected")); };
    es.onmessage = (msg: MessageEvent<string>) => {
      try {
        const ev = JSON.parse(msg.data) as FeedEvent;
        newIds = new Set([...newIds, ev.id]);
        events = [ev, ...events].slice(0, 200);
        setTimeout(() => { const s = new Set(newIds); s.delete(ev.id); newIds = s; }, 600);
      } catch { /* ignore */ }
    };
  });

  onDestroy(() => { es?.close(); connected = false; });
</script>

<div class={[!unstyled && "miosa-af", !unstyled && `miosa-af--${theme}`, className].filter(Boolean).join(" ")} {style} data-miosa-theme={theme}>
  <div class="miosa-af__header">
    <span class={["miosa-af__status", connected ? "miosa-af__status--live" : "miosa-af__status--offline"].join(" ")} aria-label={connected ? "Live" : "Disconnected"}>
      {connected ? "● Live" : "○ Disconnected"}
    </span>
    <div class="miosa-af__chips" role="group" aria-label="Filter by category">
      {#each EVENT_CATEGORIES as cat}
        <button type="button" class={["miosa-af__chip", activeCategories.has(cat) && "miosa-af__chip--active"].filter(Boolean).join(" ")}
          aria-pressed={activeCategories.has(cat)} onclick={() => toggleCategory(cat)}>{cat}</button>
      {/each}
    </div>
  </div>

  <ul class="miosa-af__list" role="list" aria-label="Activity feed" aria-live="polite" aria-atomic="false" aria-relevant="additions">
    {#each filtered as ev (ev.id)}
      <li class={["miosa-af__item", newIds.has(ev.id) && "miosa-af__item--new"].filter(Boolean).join(" ")}>
        <span class="miosa-af__event-type">{ev.type}</span>
        {#if ev.actor}<span class="miosa-af__event-actor">{ev.actor}</span>{/if}
        {#if ev.resource}<span class="miosa-af__event-resource">{ev.resource}</span>{/if}
        <span class="miosa-af__event-ts">{new Date(ev.ts).toLocaleTimeString()}</span>
      </li>
    {/each}
    {#if filtered.length === 0}
      <li class="miosa-af__empty">{connected ? "Waiting for events…" : "Not connected"}</li>
    {/if}
  </ul>
</div>
