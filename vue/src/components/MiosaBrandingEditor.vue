<script setup lang="ts">
import { Miosa } from "@miosa/sdk";
import { onMounted, ref, watch } from "vue";

interface BrandingData {
  product_name?: string;
  logo_url?: string;
  support_url?: string;
  primary_color?: string;
  background_color?: string;
}

interface BrandingSdk {
  tenant: {
    getBranding: () => Promise<unknown>;
    setBranding: (p: BrandingData) => Promise<unknown>;
  };
}

const props = withDefaults(
  defineProps<{
    apiKey: string;
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
    onSave?: (branding: BrandingData) => void;
  }>(),
  { theme: "dark", unstyled: false },
);

const draft = ref<BrandingData>({});
const loading = ref(true);
const saving = ref(false);
const error = ref<Error | null>(null);

function asApi(apiKey: string): BrandingSdk {
  return new Miosa({ apiKey }) as unknown as BrandingSdk;
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const raw = await asApi(props.apiKey).tenant.getBranding();
    draft.value = ((raw as { data?: BrandingData }).data ?? raw) as BrandingData;
  } catch (e) {
    error.value = e instanceof Error ? e : new Error(String(e));
    props.onError?.(error.value);
  } finally {
    loading.value = false;
  }
}

async function save(e: Event) {
  e.preventDefault();
  if (saving.value) return;
  saving.value = true;
  try {
    await asApi(props.apiKey).tenant.setBranding(draft.value);
    props.onSave?.(draft.value);
  } catch (err) {
    props.onError?.(err instanceof Error ? err : new Error(String(err)));
  } finally {
    saving.value = false;
  }
}

const FIELDS = [
  ["product_name", "Product name", "text"],
  ["logo_url", "Logo URL", "url"],
  ["support_url", "Support URL", "url"],
  ["primary_color", "Primary color", "color"],
  ["background_color", "Background color", "color"],
] as [keyof BrandingData, string, string][];

onMounted(load);
watch(() => props.apiKey, load);
</script>

<template>
  <div
    :class="[!unstyled && 'miosa-be', !unstyled && `miosa-be--${theme}`]"
    :data-miosa-theme="theme"
  >
    <div v-if="loading" class="miosa-be__skeleton" aria-busy="true" aria-label="Loading branding" />
    <div v-else-if="error" role="alert">{{ error.message }}</div>
    <div v-else class="miosa-be__layout">
      <form class="miosa-be__form" aria-label="Branding settings" @submit="save">
        <div v-for="[key, label, inputType] in FIELDS" :key="key" class="miosa-be__field">
          <label :for="`miosa-be-${key}`" class="miosa-be__label">{{ label }}</label>
          <input
            :id="`miosa-be-${key}`"
            :type="inputType"
            class="miosa-be__input"
            :value="draft[key] ?? ''"
            :aria-label="label"
            @input="(e) => { draft[key] = (e.target as HTMLInputElement).value || undefined }"
          />
        </div>
        <button type="submit" class="miosa-be__save-btn" :disabled="saving" aria-label="Save branding">
          {{ saving ? "Saving…" : "Save branding" }}
        </button>
      </form>
      <div class="miosa-be__preview" aria-label="Branding preview">
        <h3 class="miosa-be__preview-title">Preview</h3>
        <div
          role="img"
          aria-label="Error page preview"
          :style="{
            background: draft.background_color ?? '#0d0d0d',
            padding: '24px',
            borderRadius: '8px',
            fontFamily: 'system-ui, sans-serif',
            color: draft.primary_color ?? '#f0f0f0',
            minHeight: '120px',
          }"
        >
          <img v-if="draft.logo_url" :src="draft.logo_url" alt="Logo" style="max-height:40px;margin-bottom:12px" />
          <div style="font-size:18px;font-weight:600;margin-bottom:8px">
            {{ draft.product_name ?? "Your Product" }}
          </div>
          <div style="font-size:13px;opacity:0.7">
            Something went wrong. Contact
            <a v-if="draft.support_url" :href="draft.support_url" :style="{ color: draft.primary_color }">support</a>
            <span v-else>support</span>.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
