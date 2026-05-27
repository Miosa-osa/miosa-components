<script setup lang="ts">
import { Miosa } from "@miosa/sdk";
import { onUnmounted, ref, computed } from "vue";

type BulkAction = "pause" | "resume" | "destroy" | "applyPolicy";

interface JobStatus {
  id: string;
  action: BulkAction;
  queued: number;
  completed: number;
  failed: number;
  status: "running" | "done" | "error";
}

const ACTION_LABELS: Record<BulkAction, string> = {
  pause: "Pause", resume: "Resume", destroy: "Destroy", applyPolicy: "Apply policy",
};

const props = withDefaults(
  defineProps<{
    selectedIds: string[];
    actions?: BulkAction[];
    apiKey: string;
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
    onComplete?: (action: BulkAction, jobId: string) => void;
  }>(),
  { theme: "dark", unstyled: false, actions: () => ["pause", "resume", "destroy"] as BulkAction[] },
);

const jobs = ref<JobStatus[]>([]);
const pendingAction = ref<BulkAction | null>(null);
const pollTimers = new Map<string, ReturnType<typeof setInterval>>();

const visible = computed(() => props.selectedIds.length > 0 || jobs.value.length > 0);

interface BulkSdk {
  bulk: {
    sandboxes: Record<string, (p: { ids: string[] }) => Promise<unknown>>;
    jobs: { get: (p: { id: string }) => Promise<unknown> };
  };
}

function asApi(apiKey: string): BulkSdk {
  return new Miosa({ apiKey }) as unknown as BulkSdk;
}

function pollJob(jobId: string, action: BulkAction) {
  const timer = setInterval(async () => {
    try {
      const raw = await asApi(props.apiKey).bulk.jobs.get({ id: jobId });
      const s = raw as { status: string; completed: number; failed: number; queued: number };
      const done = s.status === "done" || s.status === "error";
      jobs.value = jobs.value.map((j) =>
        j.id === jobId
          ? { ...j, status: s.status as JobStatus["status"], completed: s.completed ?? j.completed, failed: s.failed ?? j.failed }
          : j,
      );
      if (done) {
        clearInterval(timer);
        pollTimers.delete(jobId);
        props.onComplete?.(action, jobId);
      }
    } catch { /* ignore */ }
  }, 1500);
  pollTimers.set(jobId, timer);
}

async function handleAction(action: BulkAction) {
  if (props.selectedIds.length === 0) return;
  const label = ACTION_LABELS[action];
  if (action === "destroy" && !window.confirm(`${label} ${props.selectedIds.length} sandbox(es)? This cannot be undone.`)) return;
  if (action !== "destroy" && !window.confirm(`${label} ${props.selectedIds.length} sandbox(es)?`)) return;
  pendingAction.value = action;
  try {
    const apiAction = action === "applyPolicy" ? "apply_policy" : action;
    const raw = await asApi(props.apiKey).bulk.sandboxes[apiAction]?.({ ids: props.selectedIds });
    const res = raw as { job_id?: string; queued?: number };
    if (res.job_id) {
      jobs.value = [
        { id: res.job_id, action, queued: res.queued ?? props.selectedIds.length, completed: 0, failed: 0, status: "running" },
        ...jobs.value,
      ];
      pollJob(res.job_id, action);
    }
  } catch (e) {
    props.onError?.(e instanceof Error ? e : new Error(String(e)));
  } finally {
    pendingAction.value = null;
  }
}

onUnmounted(() => {
  pollTimers.forEach((t) => clearInterval(t));
});
</script>

<template>
  <div
    v-if="visible"
    :class="[!unstyled && 'miosa-ba', !unstyled && `miosa-ba--${theme}`, !unstyled && 'miosa-ba--sticky']"
    :data-miosa-theme="theme"
    role="toolbar"
    aria-label="Bulk actions"
  >
    <div v-if="selectedIds.length > 0" class="miosa-ba__bar">
      <span class="miosa-ba__count">{{ selectedIds.length }} selected</span>
      <div class="miosa-ba__actions">
        <button
          v-for="action in actions"
          :key="action"
          type="button"
          :class="['miosa-ba__action-btn', action === 'destroy' && 'miosa-ba__action-btn--danger']"
          :disabled="pendingAction !== null"
          :aria-label="`${ACTION_LABELS[action]} ${selectedIds.length} items`"
          @click="handleAction(action)"
        >
          {{ pendingAction === action ? "…" : `${ACTION_LABELS[action]} (${selectedIds.length})` }}
        </button>
      </div>
    </div>
    <div v-if="jobs.length > 0" class="miosa-ba__jobs" aria-label="Job progress">
      <div v-for="job in jobs" :key="job.id" class="miosa-ba__job">
        <span class="miosa-ba__job-label">{{ ACTION_LABELS[job.action] }}</span>
        <progress class="miosa-ba__job-progress" :value="job.completed + job.failed" :max="job.queued" :aria-label="`${job.completed}/${job.queued} done`" />
        <span class="miosa-ba__job-status">{{ job.status === "running" ? `${job.completed}/${job.queued}` : job.status }}</span>
      </div>
    </div>
  </div>
</template>
