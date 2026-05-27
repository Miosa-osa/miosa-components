<script setup lang="ts">
import { Miosa } from "@miosa/sdk";
import { onMounted, onUnmounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    sandboxId: string;
    previewToken?: string;
    apiKey?: string;
    theme?: "light" | "dark";
    class?: string;
  }>(),
  { theme: "light" },
);

const emit = defineEmits<{
  error: [err: Error];
}>();

const iframeUrl = ref<string | null>(null);
const loading = ref(true);
const internalError = ref<Error | null>(null);

async function resolveUrl() {
  loading.value = true;
  internalError.value = null;
  try {
    if (props.previewToken) {
      iframeUrl.value = `https://preview.miosa.app/${props.sandboxId}?token=${props.previewToken}`;
    } else if (props.apiKey) {
      const client = new Miosa({ apiKey: props.apiKey });
      const sandbox = await client.sandboxes.get(props.sandboxId);
      const result = await (sandbox as any).previewToken(3600);
      iframeUrl.value = result.url;
    } else {
      throw new Error("Either previewToken or apiKey is required");
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    internalError.value = err;
    emit("error", err);
  } finally {
    loading.value = false;
  }
}

onMounted(resolveUrl);
watch(() => props.sandboxId, resolveUrl);

onUnmounted(() => {
  iframeUrl.value = null;
});
</script>

<template>
  <div
    :class="['miosa-preview', `miosa-preview--${theme}`, props.class]"
    role="region"
    aria-label="Sandbox preview"
  >
    <div v-if="loading" class="miosa-preview__loading" aria-live="polite">
      Loading preview…
    </div>
    <div
      v-else-if="internalError"
      class="miosa-preview__error"
      role="alert"
    >
      {{ internalError.message }}
    </div>
    <iframe
      v-else-if="iframeUrl"
      :src="iframeUrl"
      class="miosa-preview__frame"
      sandbox="allow-scripts allow-same-origin allow-forms"
      allow="clipboard-read; clipboard-write"
      title="Sandbox preview"
    />
  </div>
</template>

<style scoped>
.miosa-preview {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
  background: #0d0d0d;
}
.miosa-preview--light {
  background: #f5f5f5;
}
.miosa-preview__frame {
  width: 100%;
  height: 100%;
  border: none;
}
.miosa-preview__loading,
.miosa-preview__error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-family: system-ui, sans-serif;
  font-size: 14px;
  color: #888;
}
.miosa-preview__error {
  color: #e05c5c;
}
</style>
