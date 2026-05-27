import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn.js";
import { getClient } from "../utils/client.js";
import type { MiosaBaseProps } from "../types.js";

export type BulkAction = "pause" | "resume" | "destroy" | "applyPolicy";

export interface MiosaBulkActionsProps extends MiosaBaseProps {
  selectedIds: string[];
  actions?: BulkAction[];
  apiKey: string;
  unstyled?: boolean;
  style?: React.CSSProperties;
  onComplete?: (action: BulkAction, jobId: string) => void;
}

interface JobStatus {
  id: string;
  action: BulkAction;
  queued: number;
  completed: number;
  failed: number;
  status: "running" | "done" | "error";
}

const ACTION_LABELS: Record<BulkAction, string> = {
  pause: "Pause",
  resume: "Resume",
  destroy: "Destroy",
  applyPolicy: "Apply policy",
};

export function MiosaBulkActions({
  selectedIds,
  actions = ["pause", "resume", "destroy"],
  apiKey,
  theme = "dark",
  onError,
  onComplete,
  className,
  style,
  unstyled = false,
}: MiosaBulkActionsProps): React.ReactElement | null {
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const pollRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map(),
  );

  // Clean up polls on unmount
  useEffect(() => {
    const refs = pollRefs.current;
    return () => {
      refs.forEach((timer) => clearInterval(timer));
    };
  }, []);

  const pollJob = useCallback(
    (jobId: string, action: BulkAction) => {
      const timer = setInterval(async () => {
        try {
          const client = getClient(apiKey);
          const raw = await (
            client as unknown as {
              bulk: {
                jobs: { get: (p: { id: string }) => Promise<unknown> };
              };
            }
          ).bulk.jobs.get({ id: jobId });
          const status = raw as {
            status: string;
            completed: number;
            failed: number;
            queued: number;
          };
          const done = status.status === "done" || status.status === "error";

          setJobs((prev) =>
            prev.map((j) =>
              j.id === jobId
                ? {
                    ...j,
                    status: (status.status as JobStatus["status"]) ?? j.status,
                    completed: status.completed ?? j.completed,
                    failed: status.failed ?? j.failed,
                  }
                : j,
            ),
          );

          if (done) {
            clearInterval(timer);
            pollRefs.current.delete(jobId);
            onComplete?.(action, jobId);
          }
        } catch {
          // ignore transient poll errors
        }
      }, 1500);
      pollRefs.current.set(jobId, timer);
    },
    [apiKey, onComplete],
  );

  const handleAction = useCallback(
    async (action: BulkAction) => {
      if (selectedIds.length === 0) return;
      const label = ACTION_LABELS[action];
      const destructive = action === "destroy";
      if (
        destructive &&
        !window.confirm(
          `${label} ${selectedIds.length} sandbox(es)? This cannot be undone.`,
        )
      )
        return;
      if (
        !destructive &&
        !window.confirm(`${label} ${selectedIds.length} sandbox(es)?`)
      )
        return;

      setPendingAction(action);
      try {
        const client = getClient(apiKey);
        const apiAction = action === "applyPolicy" ? "apply_policy" : action;
        const raw = await (
          client as unknown as {
            bulk: {
              sandboxes: Record<
                string,
                (p: { ids: string[] }) => Promise<unknown>
              >;
            };
          }
        ).bulk.sandboxes[apiAction]?.({ ids: selectedIds });

        const res = raw as { job_id?: string; queued?: number };
        if (res.job_id) {
          const newJob: JobStatus = {
            id: res.job_id,
            action,
            queued: res.queued ?? selectedIds.length,
            completed: 0,
            failed: 0,
            status: "running",
          };
          setJobs((prev) => [newJob, ...prev]);
          pollJob(res.job_id, action);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
      } finally {
        setPendingAction(null);
      }
    },
    [selectedIds, apiKey, pollJob, onError],
  );

  if (selectedIds.length === 0 && jobs.length === 0) return null;

  const base = "miosa-ba";

  return (
    <div
      className={cn(
        !unstyled && base,
        !unstyled && `${base}--${theme}`,
        !unstyled && `${base}--sticky`,
        className,
      )}
      style={style}
      data-miosa-theme={theme}
      role="toolbar"
      aria-label="Bulk actions"
    >
      {selectedIds.length > 0 && (
        <div className={`${base}__bar`}>
          <span className={`${base}__count`}>
            {selectedIds.length} selected
          </span>
          <div className={`${base}__actions`}>
            {actions.map((action) => (
              <button
                key={action}
                type="button"
                className={cn(
                  `${base}__action-btn`,
                  action === "destroy" && `${base}__action-btn--danger`,
                )}
                onClick={() => void handleAction(action)}
                disabled={pendingAction !== null}
                aria-label={`${ACTION_LABELS[action]} ${selectedIds.length} items`}
              >
                {pendingAction === action
                  ? "…"
                  : `${ACTION_LABELS[action]} (${selectedIds.length})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {jobs.length > 0 && (
        <div className={`${base}__jobs`} aria-label="Job progress">
          {jobs.map((job) => (
            <div key={job.id} className={`${base}__job`}>
              <span className={`${base}__job-label`}>
                {ACTION_LABELS[job.action]}
              </span>
              <progress
                className={`${base}__job-progress`}
                value={job.completed + job.failed}
                max={job.queued}
                aria-label={`${job.completed}/${job.queued} done`}
              />
              <span className={`${base}__job-status`}>
                {job.status === "running"
                  ? `${job.completed}/${job.queued}`
                  : job.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
