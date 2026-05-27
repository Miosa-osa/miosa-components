import React, { useCallback, useEffect, useState } from "react";
import { cn } from "../utils/cn.js";
import { getClient } from "../utils/client.js";
import type { MiosaBaseProps } from "../types.js";
import { MiosaPolicyEditor } from "./MiosaPolicyEditor.js";
import { MiosaMemberManager } from "./MiosaMemberManager.js";

export interface MiosaWorkspaceManagerProps extends MiosaBaseProps {
  apiKey: string;
  unstyled?: boolean;
  style?: React.CSSProperties;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  archived: boolean;
  created_at: string;
  resource_count?: number;
}

type State =
  | { status: "loading" }
  | { status: "ready"; workspaces: Workspace[] }
  | { status: "error"; error: Error };

export function MiosaWorkspaceManager({
  apiKey,
  theme = "dark",
  onError,
  className,
  style,
  unstyled = false,
}: MiosaWorkspaceManagerProps): React.ReactElement {
  const [state, setState] = useState<State>({ status: "loading" });
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"policy" | "members">("policy");

  type WsApi = {
    list: () => Promise<unknown>;
    create: (p: { name: string }) => Promise<unknown>;
    archive: (p: { id: string }) => Promise<unknown>;
  };
  type C = { workspaces: WsApi };

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const client = (getClient(apiKey) as unknown as C).workspaces;
      const raw = await client.list();
      const data = raw as { data?: Workspace[] };
      setState({ status: "ready", workspaces: data.data ?? [] });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ status: "error", error });
      onError?.(error);
    }
  }, [apiKey, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newName.trim() || creating) return;
      setCreating(true);
      try {
        const client = (getClient(apiKey) as unknown as C).workspaces;
        await client.create({ name: newName.trim() });
        setNewName("");
        await load();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
      } finally {
        setCreating(false);
      }
    },
    [newName, creating, apiKey, load, onError],
  );

  const handleArchive = useCallback(
    async (ws: Workspace) => {
      if (
        !window.confirm(
          `Archive "${ws.name}"? Resources inside will be paused.`,
        )
      )
        return;
      setArchivingId(ws.id);
      try {
        const client = (getClient(apiKey) as unknown as C).workspaces;
        await client.archive({ id: ws.id });
        await load();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
      } finally {
        setArchivingId(null);
      }
    },
    [apiKey, load, onError],
  );

  const base = "miosa-wm";

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
      {/* Create form */}
      <form
        className={`${base}__create`}
        onSubmit={handleCreate}
        aria-label="Create workspace"
      >
        <input
          type="text"
          className={`${base}__input`}
          placeholder="New workspace name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          aria-label="Workspace name"
          required
        />
        <button
          type="submit"
          className={`${base}__create-btn`}
          disabled={creating}
          aria-label="Create workspace"
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </form>

      {state.status === "loading" && (
        <div className={`${base}__loading`} aria-busy="true">
          Loading…
        </div>
      )}
      {state.status === "error" && (
        <div className={`${base}__error`} role="alert">
          {state.error.message}
        </div>
      )}
      {state.status === "ready" && (
        <ul className={`${base}__list`} role="list" aria-label="Workspaces">
          {state.workspaces.map((ws) => (
            <li
              key={ws.id}
              className={cn(
                `${base}__item`,
                ws.archived && `${base}__item--archived`,
              )}
            >
              <button
                type="button"
                className={`${base}__item-name`}
                onClick={() =>
                  setSelectedId(selectedId === ws.id ? null : ws.id)
                }
                aria-expanded={selectedId === ws.id}
                aria-label={`Manage workspace ${ws.name}`}
              >
                {ws.name}
                {ws.archived && (
                  <span className={`${base}__badge`}>archived</span>
                )}
              </button>
              {!ws.archived && (
                <button
                  type="button"
                  className={`${base}__archive-btn`}
                  onClick={() => void handleArchive(ws)}
                  disabled={archivingId === ws.id}
                  aria-label={`Archive ${ws.name}`}
                >
                  {archivingId === ws.id ? "…" : "Archive"}
                </button>
              )}

              {selectedId === ws.id && (
                <div className={`${base}__detail`}>
                  <div className={`${base}__tabs`} role="tablist">
                    {(["policy", "members"] as const).map((tab) => (
                      <button
                        key={tab}
                        role="tab"
                        type="button"
                        aria-selected={activeTab === tab}
                        className={cn(
                          `${base}__tab`,
                          activeTab === tab && `${base}__tab--active`,
                        )}
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab === "policy" ? "Policy" : "Members"}
                      </button>
                    ))}
                  </div>
                  {activeTab === "policy" && (
                    <MiosaPolicyEditor
                      scope="workspace"
                      id={ws.id}
                      apiKey={apiKey}
                      theme={theme}
                      {...(onError ? { onError } : {})}
                    />
                  )}
                  {activeTab === "members" && (
                    <MiosaMemberManager
                      scope="workspace"
                      id={ws.id}
                      apiKey={apiKey}
                      theme={theme}
                      {...(onError ? { onError } : {})}
                    />
                  )}
                </div>
              )}
            </li>
          ))}
          {state.workspaces.length === 0 && (
            <li className={`${base}__empty`}>No workspaces yet.</li>
          )}
        </ul>
      )}
    </div>
  );
}
