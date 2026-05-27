<script setup lang="ts">
import { Miosa } from "@miosa/sdk";
import { onMounted, ref, watch } from "vue";
import MiosaPolicyEditor from "./MiosaPolicyEditor.vue";
import MiosaMemberManager from "./MiosaMemberManager.vue";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  archived: boolean;
  created_at: string;
}

interface WsApi {
  list: () => Promise<unknown>;
  create: (p: { name: string }) => Promise<unknown>;
  archive: (p: { id: string }) => Promise<unknown>;
}

interface C { workspaces: WsApi }

const props = withDefaults(
  defineProps<{
    apiKey: string;
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
  }>(),
  { theme: "dark", unstyled: false },
);

function asApi(apiKey: string): C {
  return new Miosa({ apiKey }) as unknown as C;
}

const workspaces = ref<Workspace[]>([]);
const loading = ref(true);
const error = ref<Error | null>(null);
const newName = ref("");
const creating = ref(false);
const archivingId = ref<string | null>(null);
const selectedId = ref<string | null>(null);
const activeTab = ref<"policy" | "members">("policy");

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const raw = await asApi(props.apiKey).workspaces.list();
    workspaces.value = (raw as { data?: Workspace[] }).data ?? [];
  } catch (e) {
    error.value = e instanceof Error ? e : new Error(String(e));
    props.onError?.(error.value);
  } finally {
    loading.value = false;
  }
}

async function handleCreate(e: Event) {
  e.preventDefault();
  if (!newName.value.trim() || creating.value) return;
  creating.value = true;
  try {
    await asApi(props.apiKey).workspaces.create({ name: newName.value.trim() });
    newName.value = "";
    await load();
  } catch (e) {
    props.onError?.(e instanceof Error ? e : new Error(String(e)));
  } finally {
    creating.value = false;
  }
}

async function handleArchive(ws: Workspace) {
  if (!window.confirm(`Archive "${ws.name}"? Resources inside will be paused.`)) return;
  archivingId.value = ws.id;
  try {
    await asApi(props.apiKey).workspaces.archive({ id: ws.id });
    await load();
  } catch (e) {
    props.onError?.(e instanceof Error ? e : new Error(String(e)));
  } finally {
    archivingId.value = null;
  }
}

function toggleSelect(id: string) {
  selectedId.value = selectedId.value === id ? null : id;
}

onMounted(load);
watch(() => props.apiKey, load);
</script>

<template>
  <div
    :class="[!unstyled && 'miosa-wm', !unstyled && `miosa-wm--${theme}`]"
    :data-miosa-theme="theme"
  >
    <form class="miosa-wm__create" aria-label="Create workspace" @submit="handleCreate">
      <input
        v-model="newName"
        type="text"
        class="miosa-wm__input"
        placeholder="New workspace name"
        aria-label="Workspace name"
        required
      />
      <button type="submit" class="miosa-wm__create-btn" :disabled="creating" aria-label="Create workspace">
        {{ creating ? "Creating…" : "Create" }}
      </button>
    </form>

    <div v-if="loading" class="miosa-wm__loading" aria-busy="true">Loading…</div>
    <div v-else-if="error" class="miosa-wm__error" role="alert">{{ error.message }}</div>
    <ul v-else class="miosa-wm__list" role="list" aria-label="Workspaces">
      <li
        v-for="ws in workspaces"
        :key="ws.id"
        :class="['miosa-wm__item', ws.archived && 'miosa-wm__item--archived']"
      >
        <button
          type="button"
          class="miosa-wm__item-name"
          :aria-expanded="selectedId === ws.id"
          :aria-label="`Manage workspace ${ws.name}`"
          @click="toggleSelect(ws.id)"
        >
          {{ ws.name }}
          <span v-if="ws.archived" class="miosa-wm__badge">archived</span>
        </button>
        <button
          v-if="!ws.archived"
          type="button"
          class="miosa-wm__archive-btn"
          :disabled="archivingId === ws.id"
          :aria-label="`Archive ${ws.name}`"
          @click="handleArchive(ws)"
        >
          {{ archivingId === ws.id ? "…" : "Archive" }}
        </button>

        <div v-if="selectedId === ws.id" class="miosa-wm__detail">
          <div class="miosa-wm__tabs" role="tablist">
            <button
              v-for="tab in ['policy', 'members'] as const"
              :key="tab"
              role="tab"
              type="button"
              :aria-selected="activeTab === tab"
              :class="['miosa-wm__tab', activeTab === tab && 'miosa-wm__tab--active']"
              @click="activeTab = tab"
            >
              {{ tab === "policy" ? "Policy" : "Members" }}
            </button>
          </div>
          <MiosaPolicyEditor
            v-if="activeTab === 'policy'"
            scope="workspace"
            :id="ws.id"
            :api-key="apiKey"
            :theme="theme"
            v-bind="onError ? { onError } : {}"
          />
          <MiosaMemberManager
            v-if="activeTab === 'members'"
            scope="workspace"
            :id="ws.id"
            :api-key="apiKey"
            :theme="theme"
            v-bind="onError ? { onError } : {}"
          />
        </div>
      </li>
      <li v-if="workspaces.length === 0" class="miosa-wm__empty">No workspaces yet.</li>
    </ul>
  </div>
</template>
