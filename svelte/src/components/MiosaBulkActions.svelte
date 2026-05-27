<script lang="ts">
  import { Miosa } from "@miosa/sdk";
  import { onDestroy } from "svelte";

  type BulkAction = "pause" | "resume" | "destroy" | "applyPolicy";
  interface JobStatus { id: string; action: BulkAction; queued: number; completed: number; failed: number; status: "running" | "done" | "error"; }
  const ACTION_LABELS: Record<BulkAction, string> = { pause: "Pause", resume: "Resume", destroy: "Destroy", applyPolicy: "Apply policy" };

  interface Props {
    selectedIds: string[];
    actions?: BulkAction[];
    apiKey: string;
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
    onComplete?: (action: BulkAction, jobId: string) => void;
    class?: string;
    style?: string;
  }

  let { selectedIds, actions = ["pause","resume","destroy"] as BulkAction[], apiKey, theme = "dark", unstyled = false, onError, onComplete, class: className, style }: Props = $props();

  interface BulkSdk { bulk: { sandboxes: Record<string,(p:{ids:string[]})=>Promise<unknown>>; jobs: { get: (p:{id:string})=>Promise<unknown> } } }
  function asApi(key: string): BulkSdk { return new Miosa({ apiKey: key }) as unknown as BulkSdk; }

  let jobs = $state<JobStatus[]>([]);
  let pendingAction = $state<BulkAction | null>(null);
  const pollTimers = new Map<string, ReturnType<typeof setInterval>>();

  const visible = $derived(selectedIds.length > 0 || jobs.length > 0);

  function pollJob(jobId: string, action: BulkAction) {
    const timer = setInterval(async () => {
      try {
        const raw = await asApi(apiKey).bulk.jobs.get({ id: jobId });
        const s = raw as { status: string; completed: number; failed: number; queued: number };
        const done = s.status === "done" || s.status === "error";
        jobs = jobs.map((j) => j.id === jobId ? { ...j, status: s.status as JobStatus["status"], completed: s.completed ?? j.completed, failed: s.failed ?? j.failed } : j);
        if (done) { clearInterval(timer); pollTimers.delete(jobId); onComplete?.(action, jobId); }
      } catch { /* ignore */ }
    }, 1500);
    pollTimers.set(jobId, timer);
  }

  async function handleAction(action: BulkAction) {
    if (selectedIds.length === 0) return;
    const label = ACTION_LABELS[action];
    if (action === "destroy" && !window.confirm(`${label} ${selectedIds.length} sandbox(es)? This cannot be undone.`)) return;
    if (action !== "destroy" && !window.confirm(`${label} ${selectedIds.length} sandbox(es)?`)) return;
    pendingAction = action;
    try {
      const apiAction = action === "applyPolicy" ? "apply_policy" : action;
      const raw = await asApi(apiKey).bulk.sandboxes[apiAction]?.({ ids: selectedIds });
      const res = raw as { job_id?: string; queued?: number };
      if (res.job_id) {
        jobs = [{ id: res.job_id, action, queued: res.queued ?? selectedIds.length, completed: 0, failed: 0, status: "running" }, ...jobs];
        pollJob(res.job_id, action);
      }
    } catch (e) { onError?.(e instanceof Error ? e : new Error(String(e))); }
    finally { pendingAction = null; }
  }

  onDestroy(() => { pollTimers.forEach((t) => clearInterval(t)); });
</script>

{#if visible}
  <div class={[!unstyled && "miosa-ba", !unstyled && `miosa-ba--${theme}`, !unstyled && "miosa-ba--sticky", className].filter(Boolean).join(" ")} {style} data-miosa-theme={theme} role="toolbar" aria-label="Bulk actions">
    {#if selectedIds.length > 0}
      <div class="miosa-ba__bar">
        <span class="miosa-ba__count">{selectedIds.length} selected</span>
        <div class="miosa-ba__actions">
          {#each actions as action}
            <button type="button" class={["miosa-ba__action-btn", action === "destroy" && "miosa-ba__action-btn--danger"].filter(Boolean).join(" ")}
              disabled={pendingAction !== null} aria-label={`${ACTION_LABELS[action]} ${selectedIds.length} items`} onclick={() => handleAction(action)}>
              {pendingAction === action ? "…" : `${ACTION_LABELS[action]} (${selectedIds.length})`}
            </button>
          {/each}
        </div>
      </div>
    {/if}
    {#if jobs.length > 0}
      <div class="miosa-ba__jobs" aria-label="Job progress">
        {#each jobs as job (job.id)}
          <div class="miosa-ba__job">
            <span class="miosa-ba__job-label">{ACTION_LABELS[job.action]}</span>
            <progress class="miosa-ba__job-progress" value={job.completed + job.failed} max={job.queued} aria-label={`${job.completed}/${job.queued} done`}></progress>
            <span class="miosa-ba__job-status">{job.status === "running" ? `${job.completed}/${job.queued}` : job.status}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
