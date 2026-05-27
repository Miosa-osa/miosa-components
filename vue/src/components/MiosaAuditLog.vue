<script setup lang="ts">
import { Miosa } from "@miosa/sdk";
import { onMounted, ref, watch } from "vue";

interface AuditEvent {
  id: string;
  ts: string;
  type: string;
  actor: string;
  resource: string;
  data: Record<string, unknown>;
}

interface Page {
  events: AuditEvent[];
  next_cursor?: string;
}

const props = withDefaults(
  defineProps<{
    scope?: "tenant" | "workspace" | "user";
    scopeId?: string;
    apiKey: string;
    pageSize?: number;
    filters?: { action?: string; actor?: string; resource?: string };
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
  }>(),
  { theme: "dark", pageSize: 25, unstyled: false },
);

const events = ref<AuditEvent[]>([]);
const loading = ref(true);
const error = ref<Error | null>(null);
const cursor = ref<string | undefined>(undefined);
const expandedId = ref<string | null>(null);
const filterAction = ref(props.filters?.action ?? "");
const filterActor = ref(props.filters?.actor ?? "");
const filterResource = ref(props.filters?.resource ?? "");

interface AuditSdk {
  audit_log: { list: (p: Record<string, unknown>) => Promise<unknown> };
}

function asApi(apiKey: string): AuditSdk {
  return new Miosa({ apiKey }) as unknown as AuditSdk;
}

async function load(nextCursor?: string) {
  if (!nextCursor) {
    loading.value = true;
    events.value = [];
  }
  error.value = null;
  try {
    const params: Record<string, unknown> = { limit: props.pageSize };
    if (filterAction.value) params["action"] = filterAction.value;
    if (filterActor.value) params["actor"] = filterActor.value;
    if (filterResource.value) params["resource"] = filterResource.value;
    if (nextCursor) params["cursor"] = nextCursor;
    if (props.scope === "workspace" && props.scopeId) params["filter[workspace_id]"] = props.scopeId;
    if (props.scope === "user" && props.scopeId) params["filter[external_user_id]"] = props.scopeId;

    const raw = await asApi(props.apiKey).audit_log.list(params);
    const page = raw as Page;
    events.value = [...events.value, ...(page.events ?? [])];
    cursor.value = page.next_cursor;
  } catch (e) {
    error.value = e instanceof Error ? e : new Error(String(e));
    props.onError?.(error.value);
  } finally {
    loading.value = false;
  }
}

function downloadCsv() {
  const header = "id,ts,type,actor,resource\n";
  const rows = events.value.map((e) =>
    `${e.id},${e.ts},${JSON.stringify(e.type)},${JSON.stringify(e.actor)},${JSON.stringify(e.resource)}`
  ).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "audit-log.csv"; a.click();
  URL.revokeObjectURL(url);
}

onMounted(() => load());
watch(() => [props.scope, props.scopeId, props.apiKey, filterAction.value, filterActor.value, filterResource.value], () => {
  cursor.value = undefined;
  void load();
});
</script>

<template>
  <div
    :class="[!unstyled && 'miosa-al', !unstyled && `miosa-al--${theme}`]"
    :data-miosa-theme="theme"
  >
    <div class="miosa-al__filters">
      <input v-model="filterAction" type="text" class="miosa-al__input" placeholder="Action type" aria-label="Action type" />
      <input v-model="filterActor" type="text" class="miosa-al__input" placeholder="Actor" aria-label="Actor" />
      <input v-model="filterResource" type="text" class="miosa-al__input" placeholder="Resource" aria-label="Resource" />
      <button type="button" class="miosa-al__export-btn" :disabled="loading" aria-label="Export CSV" @click="downloadCsv">
        Export CSV
      </button>
    </div>

    <div v-if="loading" class="miosa-al__loading" aria-busy="true">Loading audit log…</div>
    <div v-else-if="error" class="miosa-al__error" role="alert">{{ error.message }}</div>
    <template v-else>
      <ul class="miosa-al__list" role="list" aria-label="Audit events">
        <li v-for="ev in events" :key="ev.id" class="miosa-al__item">
          <button
            type="button"
            class="miosa-al__item-summary"
            :aria-expanded="expandedId === ev.id"
            :aria-label="`Event ${ev.type}`"
            @click="expandedId = expandedId === ev.id ? null : ev.id"
          >
            <span class="miosa-al__event-type">{{ ev.type }}</span>
            <span class="miosa-al__event-actor">{{ ev.actor }}</span>
            <span class="miosa-al__event-resource">{{ ev.resource }}</span>
            <span class="miosa-al__event-ts">{{ new Date(ev.ts).toLocaleString() }}</span>
          </button>
          <pre v-if="expandedId === ev.id" class="miosa-al__item-json">{{ JSON.stringify(ev.data, null, 2) }}</pre>
        </li>
        <li v-if="events.length === 0" class="miosa-al__empty">No events found.</li>
      </ul>
      <button v-if="cursor" type="button" class="miosa-al__load-more" aria-label="Load more events" @click="load(cursor)">
        Load more
      </button>
    </template>
  </div>
</template>
