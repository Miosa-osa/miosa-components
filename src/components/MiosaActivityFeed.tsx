import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn.js";
import { getClient } from "../utils/client.js";
import type { MiosaBaseProps } from "../types.js";

export interface MiosaActivityFeedProps extends MiosaBaseProps {
  scope?: string;
  apiKey: string;
  unstyled?: boolean;
  style?: React.CSSProperties;
}

interface FeedEvent {
  id: string;
  ts: string;
  type: string;
  actor?: string;
  resource?: string;
  data?: Record<string, unknown>;
}

const EVENT_CATEGORIES = [
  "sandbox",
  "member",
  "policy",
  "quota",
  "workspace",
] as const;
type EventCategory = (typeof EVENT_CATEGORIES)[number];

function categoryOf(type: string): EventCategory | "other" {
  for (const cat of EVENT_CATEGORIES) {
    if (type.startsWith(cat + ".")) return cat;
  }
  return "other";
}

export function MiosaActivityFeed({
  scope,
  apiKey,
  theme = "dark",
  onError,
  className,
  style,
  unstyled = false,
}: MiosaActivityFeedProps): React.ReactElement {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [activeCategories, setActiveCategories] = useState<
    Set<EventCategory | "other">
  >(new Set());
  const esRef = useRef<EventSource | null>(null);
  const newIdsRef = useRef<Set<string>>(new Set());

  const toggleCategory = useCallback((cat: EventCategory | "other") => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  useEffect(() => {
    const client = getClient(apiKey);
    const c = client as unknown as {
      tenant?: {
        events?: {
          stream: (params: { types: string[]; scope?: string }) => EventSource;
        };
      };
    };

    if (!c.tenant?.events?.stream) return;

    const es = c.tenant.events.stream({
      types: ["*"],
      scope: scope ?? "all",
    });

    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => {
      setConnected(false);
      onError?.(new Error("Activity feed disconnected"));
    };

    es.onmessage = (msg: MessageEvent<string>) => {
      try {
        const ev = JSON.parse(msg.data) as FeedEvent;
        newIdsRef.current.add(ev.id);
        setEvents((prev) => [ev, ...prev].slice(0, 200));
        // Fade-in: remove the "new" marker after animation completes
        setTimeout(() => {
          newIdsRef.current.delete(ev.id);
        }, 600);
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [apiKey, scope, onError]);

  const base = "miosa-af";

  const filtered =
    activeCategories.size === 0
      ? events
      : events.filter((ev) => activeCategories.has(categoryOf(ev.type)));

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
      <div className={`${base}__header`}>
        <span
          className={cn(
            `${base}__status`,
            connected ? `${base}__status--live` : `${base}__status--offline`,
          )}
          aria-label={connected ? "Live" : "Disconnected"}
        >
          {connected ? "● Live" : "○ Disconnected"}
        </span>
        <div
          className={`${base}__chips`}
          role="group"
          aria-label="Filter by category"
        >
          {EVENT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={cn(
                `${base}__chip`,
                activeCategories.has(cat) && `${base}__chip--active`,
              )}
              onClick={() => toggleCategory(cat)}
              aria-pressed={activeCategories.has(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <ul
        className={`${base}__list`}
        role="list"
        aria-label="Activity feed"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
      >
        {filtered.map((ev) => (
          <li
            key={ev.id}
            className={cn(
              `${base}__item`,
              newIdsRef.current.has(ev.id) && `${base}__item--new`,
            )}
          >
            <span className={`${base}__event-type`}>{ev.type}</span>
            {ev.actor && (
              <span className={`${base}__event-actor`}>{ev.actor}</span>
            )}
            {ev.resource && (
              <span className={`${base}__event-resource`}>{ev.resource}</span>
            )}
            <span className={`${base}__event-ts`}>
              {new Date(ev.ts).toLocaleTimeString()}
            </span>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className={`${base}__empty`}>
            {connected ? "Waiting for events…" : "Not connected"}
          </li>
        )}
      </ul>
    </div>
  );
}
