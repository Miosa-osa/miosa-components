<script setup lang="ts">
import { Miosa } from "@miosa/sdk";
import { ref } from "vue";

const props = defineProps<{
  sandboxId: string;
  apiKey: string;
}>();

const emit = defineEmits<{
  share: [url: string];
}>();

const loading = ref(false);
const error = ref<Error | null>(null);
const shareUrl = ref<string | null>(null);

async function handleShare() {
  loading.value = true;
  error.value = null;
  try {
    const client = new Miosa({ apiKey: props.apiKey });
    const sandbox = await client.sandboxes.get(props.sandboxId);
    const result = await (sandbox as any).previewToken(86400, "read");
    shareUrl.value = result.url;
    await navigator.clipboard.writeText(result.url).catch(() => undefined);
    emit("share", result.url);
  } catch (e) {
    error.value = e instanceof Error ? e : new Error(String(e));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="miosa-share">
    <button
      class="miosa-share__btn"
      :disabled="loading"
      :aria-busy="loading"
      aria-label="Share sandbox"
      @click="handleShare"
    >
      {{ loading ? "Generating link…" : "Share" }}
    </button>
    <span v-if="shareUrl" class="miosa-share__url" role="status" aria-live="polite">
      {{ shareUrl }}
    </span>
    <span v-if="error" class="miosa-share__error" role="alert">
      {{ error.message }}
    </span>
  </div>
</template>

<style scoped>
.miosa-share {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: system-ui, sans-serif;
  font-size: 14px;
}
.miosa-share__btn {
  padding: 6px 16px;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
  border: none;
  cursor: pointer;
  font: inherit;
  font-weight: 500;
  transition: background 0.15s;
}
.miosa-share__btn:hover:not(:disabled) { background: #1d4ed8; }
.miosa-share__btn:disabled { opacity: 0.6; cursor: not-allowed; }
.miosa-share__url {
  font-size: 12px;
  color: #888;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.miosa-share__error { color: #e05c5c; font-size: 12px; }
</style>
