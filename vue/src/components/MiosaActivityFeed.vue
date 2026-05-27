<script setup lang="ts">
import { Miosa } from "@miosa/sdk";
import { onMounted, onUnmounted, ref } from "vue";

interface FeedEvent {
  id: string;
  ts: string;
  type: string;
  actor?: string;
  resource?: string;
}

const EVENT_CATEGORIES = ["sandbox", "member", "policy", "quota", "workspace"] as const;
type EventCategory = (typeof EVENT_CATEGORIES)[number];

const props = withDefaults(
  defineProps<{
    scope?: string;
    apiKey: string;
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
  }>(),
  { theme: "dark", unstyled: false },
);

const events = ref<FeedEvent[]>([]);
const connected = ref(false);
const activeCategories = ref<Set<EventCategory | "other">>(new Set());
const newIds = ref<Set<string>>(new Set());
let es: EventSource | null = null;

function categoryOf(type: string): EventCategory | "other" {
  for (const cat of EVENT_CATEGORIES) {
    if (type.startsWith(cat + ".")) return cat;
  }
  return "other";
}

function toggleCategory(cat: EventCategory | "other") {
  const s = new Set(activeCategories.value);
  if (s.has(cat)) s.delete(cat);
  else s.add(cat);
  activeCategories.value = s;
}

function filteredEvents() {
  if (activeCategories.value.size === 0) return events.value;
  return events.value.filter((ev) => activeCategories.value.has(categoryOf(ev.type)));
}

onMounted(() => {
  interface StreamSdk {
    tenant: { events: { stream: (p: { types: string[]; scope?: string }) => EventSource } };
  }
  const c = new Miosa({ apiKey: props.apiKey }) as unknown as StreamSdk;
  if (!c.tenant?.events?.stream) return;

  es = c.tenant.events.stream({ types: ["*"], scope: props.scope ?? "all" });
  es.onopen = () => { connected.value = true; };
  es.onerror = () => {
    connected.value = false;
    props.onError?.(new Error("Activity feed disconnected"));
  };
  es.onmessage = (msg: MessageEvent<string>) => {
    try {
      const ev = JSON.parse(msg.data) as FeedEvent;
      newIds.value = new Set([...newIds.value, ev.id]);
      events.value = [ev, ...events.value].slice(0, 200);
      setTimeout(() => {
        const s = new Set(newIds.value);
        s.delete(ev.id);
        newIds.value = s;
      }, 600);
    } catch { /* ignore */ }
  };
});

onUnmounted(() => {
  es?.close();
  connected.value = false;
});
</script>

<template>
  <div
    :class="[!unstyled && 'miosa-af', !unstyled && `miosa-af--${theme}`]"
    :data-miosa-theme="theme"
  >
    <div class="miosa-af__header">
      <span
        :class="['miosa-af__status', connected ? 'miosa-af__status--live' : 'miosa-af__status--offline']"
        :aria-label="connected ? 'Live' : 'Disconnected'"
      >
        {{ connected ? "● Live" : "○ Disconnected" }}
      </span>
      <div class="miosa-af__chips" role="group" aria-label="Filter by category">
        <button
          v-for="cat in EVENT_CATEGORIES"
          :key="cat"
          type="button"
          :class="['miosa-af__chip', activeCategories.has(cat) && 'miosa-af__chip--active']"
          :aria-pressed="activeCategories.has(cat)"
          @click="toggleCategory(cat)"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <ul
      class="miosa-af__list"
      role="list"
      aria-label="Activity feed"
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions"
    >
      <li
        v-for="ev in filteredEvents()"
        :key="ev.id"
        :class="['miosa-af__item', newIds.has(ev.id) && 'miosa-af__item--new']"
      >
        <span class="miosa-af__event-type">{{ ev.type }}</span>
        <span v-if="ev.actor" class="miosa-af__event-actor">{{ ev.actor }}</span>
        <span v-if="ev.resource" class="miosa-af__event-resource">{{ ev.resource }}</span>
        <span class="miosa-af__event-ts">{{ new Date(ev.ts).toLocaleTimeString() }}</span>
      </li>
      <li v-if="filteredEvents().length === 0" class="miosa-af__empty">
        {{ connected ? "Waiting for events…" : "Not connected" }}
      </li>
    </ul>
  </div>
</template>
