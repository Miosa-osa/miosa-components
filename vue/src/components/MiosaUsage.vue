<script setup lang="ts">
import { Miosa } from "@miosa/sdk";
import { onMounted, ref, watch } from "vue";

interface UsageData {
  compute_seconds: number;
  storage_gb_hours: number;
  egress_gb: number;
  period_start: string;
  period_end: string;
}

const props = withDefaults(
  defineProps<{
    externalUserId: string;
    apiKey: string;
    period?: "current" | "last_30" | "last_7";
    theme?: "light" | "dark";
  }>(),
  { period: "current", theme: "light" },
);

const usage = ref<UsageData | null>(null);
const loading = ref(true);
const error = ref<Error | null>(null);

async function loadUsage() {
  loading.value = true;
  error.value = null;
  try {
    const client = new Miosa({ apiKey: props.apiKey });
    const result = await (client as any).usage.get({
      external_user_id: props.externalUserId,
      period: props.period,
    });
    usage.value = result?.data ?? result;
  } catch (e) {
    error.value = e instanceof Error ? e : new Error(String(e));
  } finally {
    loading.value = false;
  }
}

onMounted(loadUsage);
watch(() => [props.externalUserId, props.period], loadUsage);

function fmt(n: number, unit: string) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;
}
</script>

<template>
  <div
    :class="['miosa-usage', `miosa-usage--${theme}`]"
    role="region"
    aria-label="Usage statistics"
  >
    <div v-if="loading" class="miosa-usage__state">Loading usage…</div>
    <div v-else-if="error" class="miosa-usage__state miosa-usage__state--error" role="alert">
      {{ error.message }}
    </div>
    <dl v-else-if="usage" class="miosa-usage__list">
      <div class="miosa-usage__item">
        <dt>Compute</dt>
        <dd>{{ fmt(usage.compute_seconds, "sec") }}</dd>
      </div>
      <div class="miosa-usage__item">
        <dt>Storage</dt>
        <dd>{{ fmt(usage.storage_gb_hours, "GB·hr") }}</dd>
      </div>
      <div class="miosa-usage__item">
        <dt>Egress</dt>
        <dd>{{ fmt(usage.egress_gb, "GB") }}</dd>
      </div>
    </dl>
    <div v-else class="miosa-usage__state">No usage data.</div>
  </div>
</template>

<style scoped>
.miosa-usage {
  font-family: system-ui, sans-serif;
  font-size: 14px;
  border-radius: 8px;
  padding: 16px;
  background: #111;
  color: #ccc;
}
.miosa-usage--light {
  background: #f9f9f9;
  color: #333;
}
.miosa-usage__state { color: #888; }
.miosa-usage__state--error { color: #e05c5c; }
.miosa-usage__list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 0;
}
.miosa-usage__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.miosa-usage__item dt {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.6;
}
.miosa-usage__item dd {
  margin: 0;
  font-weight: 600;
  font-size: 16px;
}
</style>
