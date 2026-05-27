<script setup lang="ts">
import { Miosa } from "@miosa/sdk";
import { onMounted, ref, watch } from "vue";

type PolicyScope = "tenant" | "workspace" | "user";

interface PolicyField<T> {
  value: T;
  source: "user" | "workspace" | "tenant" | "platform";
}

type EffectivePolicy = Record<string, Record<string, PolicyField<unknown>>>;
type PolicyDraft = Record<string, Record<string, unknown>>;

const CATEGORIES = [
  "lifecycle",
  "quotas",
  "sizing",
  "templates",
  "features",
  "egress",
  "branding",
  "webhooks",
] as const;

const props = withDefaults(
  defineProps<{
    scope: PolicyScope;
    id?: string;
    apiKey: string;
    theme?: "light" | "dark";
    unstyled?: boolean;
    onSave?: (policy: PolicyDraft) => void;
    onError?: (err: Error) => void;
  }>(),
  { theme: "dark", unstyled: false },
);

const effective = ref<EffectivePolicy>({});
const overrides = ref<PolicyDraft>({});
const loading = ref(true);
const saving = ref(false);
const error = ref<Error | null>(null);
const openSections = ref<Set<string>>(new Set());

interface PolicySdkClient {
  tenant: {
    policy: () => Promise<unknown>;
    setPolicy: (p: unknown) => Promise<unknown>;
  };
  workspaces: {
    getPolicy: (p: { id: string }) => Promise<unknown>;
    setPolicy: (p: { id: string; policy: unknown }) => Promise<unknown>;
  };
  externalUsers: {
    effectivePolicy: (p: { external_user_id: string }) => Promise<unknown>;
    setPolicy: (p: { external_user_id: string; policy: unknown }) => Promise<unknown>;
  };
}

function asApi(apiKey: string): PolicySdkClient {
  return new Miosa({ apiKey }) as unknown as PolicySdkClient;
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const c = asApi(props.apiKey);
    let raw: unknown;
    if (props.scope === "tenant") {
      raw = await c.tenant.policy();
    } else if (props.scope === "workspace" && props.id) {
      raw = await c.workspaces.getPolicy({ id: props.id });
    } else if (props.scope === "user" && props.id) {
      raw = await c.externalUsers.effectivePolicy({ external_user_id: props.id });
    } else {
      raw = {};
    }
    effective.value = raw as EffectivePolicy;
    overrides.value = {};
  } catch (e) {
    error.value = e instanceof Error ? e : new Error(String(e));
    props.onError?.(error.value);
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  try {
    const c = asApi(props.apiKey);
    if (props.scope === "tenant") {
      await c.tenant.setPolicy(overrides.value);
    } else if (props.scope === "workspace" && props.id) {
      await c.workspaces.setPolicy({ id: props.id, policy: overrides.value });
    } else if (props.scope === "user" && props.id) {
      await c.externalUsers.setPolicy({ external_user_id: props.id, policy: overrides.value });
    }
    props.onSave?.(overrides.value);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    props.onError?.(err);
  } finally {
    saving.value = false;
  }
}

function toggleSection(cat: string) {
  const s = new Set(openSections.value);
  if (s.has(cat)) s.delete(cat);
  else s.add(cat);
  openSections.value = s;
}

function setOverride(cat: string, key: string, value: unknown) {
  const catObj = { ...(overrides.value[cat] ?? {}) };
  if (value === undefined) {
    delete catObj[key];
  } else {
    catObj[key] = value;
  }
  overrides.value = { ...overrides.value, [cat]: catObj };
}

function sourceLabel(source: string): string {
  if (source === "tenant") return "Inherited from tenant";
  if (source === "workspace") return "Inherited from workspace";
  if (source === "platform") return "Platform default";
  return "Set at this level";
}

function fmtVal(val: unknown): string {
  if (Array.isArray(val)) return val.join(", ") || "(empty)";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (val == null) return "(unset)";
  return String(val);
}

function effectiveJson() {
  return JSON.stringify(
    Object.fromEntries(
      CATEGORIES.map((cat) => [
        cat,
        Object.fromEntries(
          Object.entries(effective.value[cat] ?? {}).map(([k, f]) => [
            k,
            (overrides.value[cat] as Record<string, unknown> | undefined)?.[k] ??
              (f as PolicyField<unknown>).value,
          ]),
        ),
      ]),
    ),
    null,
    2,
  );
}

onMounted(load);
watch(() => [props.scope, props.id, props.apiKey], load);
</script>

<template>
  <div
    :class="[!unstyled && 'miosa-pe', !unstyled && `miosa-pe--${theme}`]"
    :data-miosa-theme="theme"
  >
    <div v-if="loading" class="miosa-pe__skeleton" aria-busy="true" aria-label="Loading policy" />
    <div v-else-if="error" class="miosa-pe--error" role="alert">{{ error.message }}</div>
    <template v-else>
      <div class="miosa-pe__layout">
        <div class="miosa-pe__sections">
          <div
            v-for="cat in CATEGORIES"
            :key="cat"
            class="miosa-pe__section"
            :class="`miosa-pe__section--${theme}`"
          >
            <button
              type="button"
              class="miosa-pe__section-toggle"
              :aria-expanded="openSections.has(cat)"
              @click="toggleSection(cat)"
            >
              <span class="miosa-pe__section-title">{{ cat }}</span>
              <span aria-hidden="true">{{ openSections.has(cat) ? "▾" : "▸" }}</span>
            </button>
            <div v-if="openSections.has(cat)" class="miosa-pe__section-body">
              <div
                v-for="(field, key) in (effective[cat] as Record<string, PolicyField<unknown>> | undefined)"
                :key="key"
                class="miosa-pe__section-row"
              >
                <div class="miosa-pe__section-meta">
                  <span class="miosa-pe__section-key">{{ key }}</span>
                  <span class="miosa-pe__section-source">{{ sourceLabel(field.source) }}</span>
                </div>
                <div class="miosa-pe__section-value">
                  <span v-if="!(key in (overrides[cat] ?? {}))" class="miosa-pe__section-inherited">
                    <s>{{ fmtVal(field.value) }}</s>
                  </span>
                  <input
                    v-else
                    class="miosa-pe__input"
                    :value="String((overrides[cat] as Record<string, unknown> | undefined)?.[key] ?? '')"
                    :aria-label="key"
                    @input="(e) => setOverride(cat, key, (e.target as HTMLInputElement).value)"
                  />
                  <button
                    type="button"
                    class="miosa-pe__section-toggle-inherit"
                    :aria-label="!(key in (overrides[cat] ?? {})) ? `Override ${key}` : `Revert ${key} to inherited`"
                    @click="!(key in (overrides[cat] ?? {})) ? setOverride(cat, key, field.value) : setOverride(cat, key, undefined)"
                  >
                    {{ !(key in (overrides[cat] ?? {})) ? "Override" : "Revert" }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="miosa-pe__preview" aria-label="Effective policy preview">
          <h3 class="miosa-pe__preview-title">Effective policy</h3>
          <pre class="miosa-pe__preview-json">{{ effectiveJson() }}</pre>
        </div>
      </div>
      <div class="miosa-pe__actions">
        <button
          type="button"
          class="miosa-pe__save-btn"
          :disabled="saving"
          aria-label="Save policy"
          @click="save"
        >
          {{ saving ? "Saving…" : "Save policy" }}
        </button>
      </div>
    </template>
  </div>
</template>
