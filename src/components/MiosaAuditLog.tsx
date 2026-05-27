import React, { useCallback, useEffect, useState } from "react";
import { cn } from "../utils/cn.js";
import { getClient } from "../utils/client.js";
import type { MiosaBaseProps } from "../types.js";

export interface AuditLogFilters {
  action?: string;
  actor?: string;
  resource?: string;
}

export interface MiosaAuditLogProps extends MiosaBaseProps {
  scope?: "tenant" | "workspace" | "user";
  scopeId?: string;
  apiKey: string;
  filters?: AuditLogFilters;
  pageSize?: number;
  unstyled?: boolean;
  style?: React.CSSProperties;
}

interface AuditEvent {
  id: string;
  ts: string;
  type: string;
  actor: string;
  resource: string;
  data: Record<string, unknown>;
}

interface Page {
  events: AuditEvent[];
  next_cursor?: string;
}

type State =
  | { status: "loading" }
  | { status: "ready"; events: AuditEvent[]; nextCursor?: string }
  | { status: "error"; error: Error };

function downloadCsv(events: AuditEvent[]): void {
  const header = "id,ts,type,actor,resource\n";
  const rows = events
    .map(
      (e) =>
        `${e.id},${e.ts},${JSON.stringify(e.type)},${JSON.stringify(e.actor)},${JSON.stringify(e.resource)}`,
    )
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "audit-log.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function MiosaAuditLog({
  scope,
  scopeId,
  apiKey,
  filters,
  pageSize = 25,
  theme = "dark",
  onError,
  className,
  style,
  unstyled = false,
}: MiosaAuditLogProps): React.ReactElement {
  const [state, setState] = useState<State>({ status: "loading" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localFilters, setLocalFilters] = useState<AuditLogFilters>(
    filters ?? {},
  );
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const load = useCallback(
    async (nextCursor?: string) => {
      if (!nextCursor) setState({ status: "loading" });
      try {
        const client = getClient(apiKey);
        const params: Record<string, unknown> = {
          limit: pageSize,
          ...localFilters,
        };
        if (nextCursor) params["cursor"] = nextCursor;
        if (scope === "workspace" && scopeId)
          params["filter[workspace_id]"] = scopeId;
        if (scope === "user" && scopeId)
          params["filter[external_user_id]"] = scopeId;

        const raw = await (
          client as unknown as {
            audit_log: {
              list: (p: Record<string, unknown>) => Promise<unknown>;
            };
          }
        ).audit_log.list(params);

        const page = raw as Page;
        const incoming = page.events ?? [];

        setState((prev) => {
          const existing =
            nextCursor && prev.status === "ready" ? prev.events : [];
          const result: State = page.next_cursor
            ? {
                status: "ready",
                events: [...existing, ...incoming],
                nextCursor: page.next_cursor,
              }
            : { status: "ready", events: [...existing, ...incoming] };
          return result;
        });
        setCursor(page.next_cursor);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState({ status: "error", error });
        onError?.(error);
      }
    },
    [apiKey, pageSize, localFilters, scope, scopeId, onError],
  );

  useEffect(() => {
    setCursor(undefined);
    void load(undefined);
  }, [load]);

  const base = "miosa-al";

  return (
    <div
      className={cn(
        !unstyled && base,
        !unstyled && `${base}--${theme}`,
        className,
      )}
      style={style}
      data-miosa-theme={theme}
    >
      {/* Filters */}
      <div className={`${base}__filters`}>
        {(
          [
            ["action", "Action type"],
            ["actor", "Actor"],
            ["resource", "Resource"],
          ] as [keyof AuditLogFilters, string][]
        ).map(([key, placeholder]) => (
          <input
            key={key}
            type="text"
            className={`${base}__input`}
            placeholder={placeholder}
            value={localFilters[key] ?? ""}
            onChange={(e) =>
              setLocalFilters((f) => ({
                ...f,
                [key]: e.target.value || undefined,
              }))
            }
            aria-label={placeholder}
          />
        ))}
        <button
          type="button"
          className={`${base}__export-btn`}
          onClick={() => state.status === "ready" && downloadCsv(state.events)}
          disabled={state.status !== "ready"}
          aria-label="Export CSV"
        >
          Export CSV
        </button>
      </div>

      {state.status === "loading" && (
        <div className={`${base}__loading`} aria-busy="true">
          Loading audit log…
        </div>
      )}
      {state.status === "error" && (
        <div className={`${base}__error`} role="alert">
          {state.error.message}
        </div>
      )}
      {state.status === "ready" && (
        <>
          <ul className={`${base}__list`} role="list" aria-label="Audit events">
            {state.events.map((ev) => (
              <li key={ev.id} className={`${base}__item`}>
                <button
                  type="button"
                  className={`${base}__item-summary`}
                  onClick={() =>
                    setExpandedId(expandedId === ev.id ? null : ev.id)
                  }
                  aria-expanded={expandedId === ev.id}
                  aria-label={`Event ${ev.type}`}
                >
                  <span className={`${base}__event-type`}>{ev.type}</span>
                  <span className={`${base}__event-actor`}>{ev.actor}</span>
                  <span className={`${base}__event-resource`}>
                    {ev.resource}
                  </span>
                  <span className={`${base}__event-ts`}>
                    {new Date(ev.ts).toLocaleString()}
                  </span>
                </button>
                {expandedId === ev.id && (
                  <pre className={`${base}__item-json`}>
                    {JSON.stringify(ev.data, null, 2)}
                  </pre>
                )}
              </li>
            ))}
            {state.events.length === 0 && (
              <li className={`${base}__empty`}>No events found.</li>
            )}
          </ul>
          {cursor && (
            <button
              type="button"
              className={`${base}__load-more`}
              onClick={() => void load(cursor)}
              aria-label="Load more events"
            >
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}
