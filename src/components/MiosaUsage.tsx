import React, { useEffect, useState } from "react";
import { cn } from "../utils/cn.js";
import { getClient } from "../utils/client.js";
import type { MiosaBaseProps } from "../types.js";

export interface MiosaUsageProps extends MiosaBaseProps {
  externalUserId: string;
  apiKey: string;
  period?: "7d" | "30d" | "90d";
}

interface UsagePoint {
  label: string;
  value: number;
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; points: UsagePoint[]; unit: string; total: number }
  | { status: "error"; error: Error };

function BarChart({
  points,
  theme,
}: {
  points: UsagePoint[];
  theme: string;
}): React.ReactElement {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <svg
      className={cn("miosa-usage__chart", `miosa-usage__chart--${theme}`)}
      viewBox={`0 0 ${points.length * 20} 60`}
      aria-label="Usage chart"
      role="img"
      preserveAspectRatio="none"
    >
      {points.map((pt, i) => {
        const barH = Math.max((pt.value / max) * 50, 1);
        return (
          <g key={i}>
            <rect
              x={i * 20 + 2}
              y={60 - barH - 8}
              width={16}
              height={barH}
              className="miosa-usage__bar"
              rx={2}
            >
              <title>
                {pt.label}: {pt.value}
              </title>
            </rect>
          </g>
        );
      })}
    </svg>
  );
}

export function MiosaUsage({
  externalUserId,
  apiKey,
  period = "30d",
  theme = "dark",
  onError,
  className,
}: MiosaUsageProps): React.ReactElement {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    async function load(): Promise<void> {
      try {
        const client = getClient(apiKey);
        const raw = await (
          client.usage as unknown as {
            get: (params: Record<string, unknown>) => Promise<unknown>;
          }
        ).get({ external_user_id: externalUserId, period });

        const data = raw as Record<string, unknown>;
        const buckets = Array.isArray(data["buckets"]) ? data["buckets"] : [];
        const points: UsagePoint[] = (
          buckets as Array<Record<string, unknown>>
        ).map((b) => ({
          label: String(b["date"] ?? b["label"] ?? ""),
          value: Number(b["value"] ?? b["count"] ?? 0),
        }));
        const unit = String(data["unit"] ?? "seconds");
        const total = Number(
          data["total"] ?? points.reduce((s, p) => s + p.value, 0),
        );

        if (!cancelled) setState({ status: "ready", points, unit, total });
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
  }, [externalUserId, apiKey, period, onError]);

  const base = "miosa-usage";

  if (state.status === "loading") {
    return (
      <div
        className={cn(base, `${base}--${theme}`, className)}
        aria-busy="true"
        aria-label="Loading usage"
      >
        <div className={`${base}__skeleton`} />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className={cn(base, `${base}--error`, `${base}--${theme}`, className)}
        role="alert"
      >
        <span className={`${base}__error-text`}>{state.error.message}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(base, `${base}--${theme}`, className)}
      data-miosa-theme={theme}
    >
      <div className={`${base}__header`}>
        <span className={`${base}__total`}>
          {state.total.toLocaleString()} {state.unit}
        </span>
        <span className={`${base}__period`}>{period}</span>
      </div>
      {state.points.length > 0 && (
        <BarChart points={state.points} theme={theme} />
      )}
    </div>
  );
}
