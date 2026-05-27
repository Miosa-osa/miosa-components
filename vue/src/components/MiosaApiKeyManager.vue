<script setup lang="ts">
import { Miosa } from "@miosa/sdk";
import { onMounted, ref } from "vue";

interface ApiKey {
  id: string;
  name: string;
  last4: string;
  scopes: string[];
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  external_user_id?: string;
}

interface ApiKeySdk {
  apiKeys: {
    list: () => Promise<unknown>;
    create: (p: Record<string, unknown>) => Promise<unknown>;
    createScoped: (p: Record<string, unknown>) => Promise<unknown>;
    revoke: (p: { id: string }) => Promise<unknown>;
  };
}

const ALL_SCOPES = [
  "sandboxes:read","sandboxes:write","computers:read","computers:write",
  "storage:read","storage:write","databases:read","databases:write",
  "usage:read","audit_log:read","tenant:admin",
];

const props = withDefaults(
  defineProps<{
    apiKey: string;
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
  }>(),
  { theme: "dark", unstyled: false },
);

function asApi(apiKey: string): ApiKeySdk {
  return new Miosa({ apiKey }) as unknown as ApiKeySdk;
}

const keys = ref<ApiKey[]>([]);
const loading = ref(true);
const error = ref<Error | null>(null);
const creating = ref(false);
const revealSecret = ref<string | null>(null);
const revokingId = ref<string | null>(null);

// form state
const formName = ref("");
const formScopes = ref<string[]>([]);
const formExpiresAt = ref("");
const formIsL2 = ref(false);
const formExternalUserId = ref("");

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const raw = await asApi(props.apiKey).apiKeys.list();
    keys.value = (raw as { data?: ApiKey[] }).data ?? [];
  } catch (e) {
    error.value = e instanceof Error ? e : new Error(String(e));
    props.onError?.(error.value);
  } finally {
    loading.value = false;
  }
}

function toggleScope(scope: string) {
  if (formScopes.value.includes(scope)) {
    formScopes.value = formScopes.value.filter((s) => s !== scope);
  } else {
    formScopes.value = [...formScopes.value, scope];
  }
}

function copyToClipboard(text: string) {
  window.navigator.clipboard.writeText(text).catch(() => undefined);
}

async function handleCreate(e: Event) {
  e.preventDefault();
  if (!formName.value.trim() || creating.value) return;
  creating.value = true;
  try {
    const params: Record<string, unknown> = { name: formName.value.trim(), scopes: formScopes.value };
    if (formExpiresAt.value) params["expires_at"] = formExpiresAt.value;
    if (formIsL2.value && formExternalUserId.value) params["external_user_id"] = formExternalUserId.value;
    const fn = formIsL2.value ? "createScoped" : "create";
    const raw = await asApi(props.apiKey).apiKeys[fn](params);
    const result = raw as { secret?: string };
    if (result.secret) revealSecret.value = result.secret;
    formName.value = ""; formScopes.value = []; formExpiresAt.value = "";
    formIsL2.value = false; formExternalUserId.value = "";
    await load();
  } catch (e) {
    props.onError?.(e instanceof Error ? e : new Error(String(e)));
  } finally {
    creating.value = false;
  }
}

async function handleRevoke(keyId: string) {
  if (!window.confirm("Revoke this API key? This cannot be undone.")) return;
  revokingId.value = keyId;
  try {
    await asApi(props.apiKey).apiKeys.revoke({ id: keyId });
    await load();
  } catch (e) {
    props.onError?.(e instanceof Error ? e : new Error(String(e)));
  } finally {
    revokingId.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div
    :class="[!unstyled && 'miosa-akm', !unstyled && `miosa-akm--${theme}`]"
    :data-miosa-theme="theme"
  >
    <!-- Reveal modal -->
    <div v-if="revealSecret" class="miosa-akm__modal-overlay" role="dialog" aria-modal="true" aria-label="API key created">
      <div class="miosa-akm__modal">
        <h3 class="miosa-akm__modal-title">API key created</h3>
        <p class="miosa-akm__modal-hint">Copy this secret now — it will not be shown again.</p>
        <code class="miosa-akm__secret">{{ revealSecret }}</code>
        <button type="button" class="miosa-akm__copy-btn" aria-label="Copy secret to clipboard" @click="() => copyToClipboard(revealSecret!)">Copy</button>
        <button type="button" class="miosa-akm__modal-close" @click="revealSecret = null">Done</button>
      </div>
    </div>

    <!-- Create form -->
    <form class="miosa-akm__create" aria-label="Create API key" @submit="handleCreate">
      <h3 class="miosa-akm__form-title">New API key</h3>
      <input v-model="formName" type="text" class="miosa-akm__input" placeholder="Key name" aria-label="Key name" required />
      <label class="miosa-akm__label">
        <input v-model="formIsL2" type="checkbox" aria-label="Scoped (L2) key" /> Scoped (L2) — bound to an external user
      </label>
      <input v-if="formIsL2" v-model="formExternalUserId" type="text" class="miosa-akm__input" placeholder="external_user_id" aria-label="External user ID" />
      <div class="miosa-akm__scopes" role="group" aria-label="Scopes">
        <label v-for="scope in ALL_SCOPES" :key="scope" class="miosa-akm__scope-label">
          <input type="checkbox" :checked="formScopes.includes(scope)" :aria-label="scope" @change="toggleScope(scope)" />
          {{ scope }}
        </label>
      </div>
      <input v-model="formExpiresAt" type="datetime-local" class="miosa-akm__input" aria-label="Expiration date (optional)" title="Expiration date (optional)" />
      <button type="submit" class="miosa-akm__create-btn" :disabled="creating" aria-label="Create API key">
        {{ creating ? "Creating…" : "Create key" }}
      </button>
    </form>

    <!-- Key list -->
    <div v-if="loading" class="miosa-akm__loading" aria-busy="true">Loading…</div>
    <div v-else-if="error" class="miosa-akm__error" role="alert">{{ error.message }}</div>
    <ul v-else class="miosa-akm__list" role="list" aria-label="API keys">
      <li v-for="k in keys" :key="k.id" class="miosa-akm__item">
        <div class="miosa-akm__item-info">
          <span class="miosa-akm__item-name">{{ k.name }}</span>
          <code class="miosa-akm__item-last4">…{{ k.last4 }}</code>
          <span v-if="k.external_user_id" class="miosa-akm__item-badge">L2</span>
        </div>
        <div class="miosa-akm__item-scopes">
          <span v-for="s in k.scopes" :key="s" class="miosa-akm__scope-chip">{{ s }}</span>
        </div>
        <div class="miosa-akm__item-meta">
          <span>Created {{ new Date(k.created_at).toLocaleDateString() }}</span>
          <span v-if="k.last_used_at">Last used {{ new Date(k.last_used_at).toLocaleDateString() }}</span>
          <span v-if="k.expires_at">Expires {{ new Date(k.expires_at).toLocaleDateString() }}</span>
        </div>
        <button type="button" class="miosa-akm__revoke-btn" :disabled="revokingId === k.id" :aria-label="`Revoke ${k.name}`" @click="handleRevoke(k.id)">
          {{ revokingId === k.id ? "…" : "Revoke" }}
        </button>
      </li>
      <li v-if="keys.length === 0" class="miosa-akm__empty">No API keys yet.</li>
    </ul>
  </div>
</template>
