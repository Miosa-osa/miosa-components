import React, { useEffect, useState } from "react";
import { cn } from "../utils/cn.js";
import { getClient } from "../utils/client.js";
import type { MiosaBaseProps } from "../types.js";

export type UsageScope = "tenant" | "workspace" | "user";

export interface MiosaUsageDashboardProps extends MiosaBaseProps {
  scope: UsageScope;
  id?: string;
  apiKey: string;
  period?: "7d" | "30d" | "90d";
  unstyled?: boolean;
  style?: React.CSSProperties;
}

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

type State =
  | { status: "loading" }
  | { status: "ready"; data: UsageData }
  | { status: "error"; error: Error };

// Pure SVG line chart — no external lib
function LineChart({
  buckets,
  field,
  color,
}: {
  buckets: UsageBucket[];
  field: keyof Omit<UsageBucket, "label">;
  color: string;
}): React.ReactElement {
  const W = 300;
  const H = 80;
  const pad = 8;
  const vals = buckets.map((b) => b[field] as number);
  const max = Math.max(...vals, 1);
  const pts = vals.map((v, i) => {
    const x = pad + (i / Math.max(vals.length - 1, 1)) * (W - pad * 2);
    const y = H - pad - (v / max) * (H - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      aria-label={`${field} over time`}
      role="img"
      className="miosa-ud__chart-svg"
      preserveAspectRatio="none"
    >
      {pts.length > 1 && (
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {vals.map((v, i) => {
        const [px, py] = (pts[i] ?? "0,0").split(",");
        return (
          <circle key={i} cx={px} cy={py} r={3} fill={color}>
            <title>
              {buckets[i]?.label}: {v}
            </title>
          </circle>
        );
      })}
    </svg>
  );
}

export function MiosaUsageDashboard({
  scope,
  id,
  apiKey,
  period = "30d",
  theme = "dark",
  onError,
  className,
  style,
  unstyled = false,
}: MiosaUsageDashboardProps): React.ReactElement {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    async function load(): Promise<void> {
      try {
        const client = getClient(apiKey);
        const params: Record<string, unknown> = { period };
        if (scope === "workspace" && id) params["workspace_id"] = id;
        if (scope === "user" && id) params["external_user_id"] = id;
        const raw = await (
          client.usage as unknown as {
            get: (p: Record<string, unknown>) => Promise<unknown>;
          }
        ).get(params);
        const data = raw as UsageData;
        if (!cancelled) setState({ status: "ready", data });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (!cancelled) {
          setState({ status: "error", error });
          onError?.(error);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [scope, id, apiKey, period, onError]);

  const base = "miosa-ud";

  if (state.status === "loading") {
    return (
      <div
        className={cn(!unstyled && base, className)}
        style={style}
        aria-busy="true"
        aria-label="Loading usage dashboard"
      >
        <div className={`${base}__skeleton`} />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className={cn(!unstyled && base, className)}
        style={style}
        role="alert"
      >
        {state.error.message}
      </div>
    );
  }

  const { data } = state;
  const accentColors = {
    sandbox_hours: "var(--miosa-accent, #4f8ef7)",
    storage_gb_hours: "var(--miosa-success, #34d399)",
    credits: "var(--miosa-error, #f87171)",
  };

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
      {/* Totals row */}
      <div className={`${base}__totals`}>
        {(
          [
            ["Sandbox Hours", data.totals.sandbox_hours, "hrs"],
            ["Storage GB·hr", data.totals.storage_gb_hours, "GB·hr"],
            ["Credits", data.totals.credits, "cr"],
          ] as [string, number, string][]
        ).map(([label, val, unit]) => (
          <div key={label} className={`${base}__total-card`}>
            <span className={`${base}__total-label`}>{label}</span>
            <span className={`${base}__total-val`}>
              {val.toLocaleString()} {unit}
            </span>
          </div>
        ))}
      </div>

      {/* Charts */}
      {data.buckets.length > 0 && (
        <div className={`${base}__charts`}>
          {(
            [
              ["Sandbox hours", "sandbox_hours"],
              ["Storage GB·hr", "storage_gb_hours"],
              ["Credits", "credits"],
            ] as [string, keyof Omit<UsageBucket, "label">][]
          ).map(([label, field]) => (
            <div key={field} className={`${base}__chart`}>
              <span className={`${base}__chart-label`}>{label}</span>
              <LineChart
                buckets={data.buckets}
                field={field}
                color={accentColors[field]}
              />
            </div>
          ))}
        </div>
      )}

      {/* Top users table */}
      {data.top_users.length > 0 && (
        <div className={`${base}__top-users`}>
          <h3 className={`${base}__section-title`}>Top users</h3>
          <table className={`${base}__table`} aria-label="Top users by usage">
            <thead>
              <tr>
                <th>User</th>
                <th>Sandbox hrs</th>
                <th>Credits</th>
              </tr>
            </thead>
            <tbody>
              {data.top_users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email ?? u.id}</td>
                  <td>{u.sandbox_hours.toLocaleString()}</td>
                  <td>{u.credits.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
