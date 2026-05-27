<script setup lang="ts">
import { Miosa } from "@miosa/sdk";
import { onMounted, ref, watch } from "vue";

type UsageScope = "tenant" | "workspace" | "user";

interface UsageBucket {
  label: string;
  sandbox_hours: number;
  storage_gb_hours: number;
  credits: number;
}

interface TopUser {
  id: string;
  email?: string;
  sandbox_hours: number;
  credits: number;
}

interface UsageData {
  buckets: UsageBucket[];
  top_users: TopUser[];
  totals: { sandbox_hours: number; storage_gb_hours: number; credits: number };
}

const props = withDefaults(
  defineProps<{
    scope: UsageScope;
    id?: string;
    apiKey: string;
    period?: "7d" | "30d" | "90d";
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
  }>(),
  { theme: "dark", period: "30d", unstyled: false },
);

const data = ref<UsageData | null>(null);
const loading = ref(true);
const error = ref<Error | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const client = new Miosa({ apiKey: props.apiKey });
    const params: Record<string, unknown> = { period: props.period };
    if (props.scope === "workspace" && props.id) params["workspace_id"] = props.id;
    if (props.scope === "user" && props.id) params["external_user_id"] = props.id;
    const raw = await (client as any).usage.get(params);
    data.value = raw as UsageData;
  } catch (e) {
    error.value = e instanceof Error ? e : new Error(String(e));
    props.onError?.(error.value);
  } finally {
    loading.value = false;
  }
}

function linePoints(buckets: UsageBucket[], field: keyof Omit<UsageBucket, "label">): string {
  const W = 300; const H = 80; const pad = 8;
  const vals = buckets.map((b) => b[field] as number);
  const max = Math.max(...vals, 1);
  return vals.map((v, i) => {
    const x = pad + (i / Math.max(vals.length - 1, 1)) * (W - pad * 2);
    const y = H - pad - (v / max) * (H - pad * 2);
    return `${x},${y}`;
  }).join(" ");
}

const ACCENT = "var(--miosa-accent,#4f8ef7)";
const SUCCESS = "var(--miosa-success,#34d399)";
const ERROR_C = "var(--miosa-error,#f87171)";

onMounted(load);
watch(() => [props.scope, props.id, props.apiKey, props.period], load);
</script>

<template>
  <div
    :class="[!unstyled && 'miosa-ud', !unstyled && `miosa-ud--${theme}`]"
    :data-miosa-theme="theme"
  >
    <div v-if="loading" class="miosa-ud__skeleton" aria-busy="true" aria-label="Loading usage dashboard" />
    <div v-else-if="error" role="alert">{{ error.message }}</div>
    <template v-else-if="data">
      <div class="miosa-ud__totals">
        <div class="miosa-ud__total-card">
          <span class="miosa-ud__total-label">Sandbox Hours</span>
          <span class="miosa-ud__total-val">{{ data.totals.sandbox_hours.toLocaleString() }} hrs</span>
        </div>
        <div class="miosa-ud__total-card">
          <span class="miosa-ud__total-label">Storage GB·hr</span>
          <span class="miosa-ud__total-val">{{ data.totals.storage_gb_hours.toLocaleString() }} GB·hr</span>
        </div>
        <div class="miosa-ud__total-card">
          <span class="miosa-ud__total-label">Credits</span>
          <span class="miosa-ud__total-val">{{ data.totals.credits.toLocaleString() }} cr</span>
        </div>
      </div>

      <div v-if="data.buckets.length > 0" class="miosa-ud__charts">
        <div v-for="[label, field, color] in [['Sandbox hours', 'sandbox_hours', ACCENT], ['Storage GB·hr', 'storage_gb_hours', SUCCESS], ['Credits', 'credits', ERROR_C]]" :key="field as string" class="miosa-ud__chart">
          <span class="miosa-ud__chart-label">{{ label }}</span>
          <svg viewBox="0 0 300 80" class="miosa-ud__chart-svg" :aria-label="`${label} over time`" role="img" preserveAspectRatio="none">
            <polyline :points="linePoints(data.buckets, field as keyof Omit<UsageBucket, 'label'>)" fill="none" :stroke="color as string" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
          </svg>
        </div>
      </div>

      <div v-if="data.top_users.length > 0" class="miosa-ud__top-users">
        <h3 class="miosa-ud__section-title">Top users</h3>
        <table class="miosa-ud__table" aria-label="Top users by usage">
          <thead><tr><th>User</th><th>Sandbox hrs</th><th>Credits</th></tr></thead>
          <tbody>
            <tr v-for="u in data.top_users" :key="u.id">
              <td>{{ u.email ?? u.id }}</td>
              <td>{{ u.sandbox_hours.toLocaleString() }}</td>
              <td>{{ u.credits.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
