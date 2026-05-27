import React, { useCallback, useEffect, useState } from "react";
import { cn } from "../utils/cn.js";
import { getClient } from "../utils/client.js";
import type { MiosaBaseProps } from "../types.js";

export interface MiosaApiKeyManagerProps extends MiosaBaseProps {
  apiKey: string;
  unstyled?: boolean;
  style?: React.CSSProperties;
}

const ALL_SCOPES = [
  "sandboxes:read",
  "sandboxes:write",
  "computers:read",
  "computers:write",
  "storage:read",
  "storage:write",
  "databases:read",
  "databases:write",
  "usage:read",
  "audit_log:read",
  "tenant:admin",
];

interface ApiKey {
  id: string;
  name: string;
  last4: string;
  scopes: string[];
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  external_user_id?: string;
}

type State =
  | { status: "loading" }
  | { status: "ready"; keys: ApiKey[] }
  | { status: "error"; error: Error };

interface CreateForm {
  name: string;
  scopes: string[];
  expires_at: string;
  external_user_id: string;
  isL2: boolean;
}

const DEFAULT_FORM: CreateForm = {
  name: "",
  scopes: [],
  expires_at: "",
  external_user_id: "",
  isL2: false,
};

export function MiosaApiKeyManager({
  apiKey,
  theme = "dark",
  onError,
  className,
  style,
  unstyled = false,
}: MiosaApiKeyManagerProps): React.ReactElement {
  const [state, setState] = useState<State>({ status: "loading" });
  const [form, setForm] = useState<CreateForm>(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [revealSecret, setRevealSecret] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const client = getClient(apiKey);
      const raw = await (
        client as unknown as {
          apiKeys: { list: () => Promise<unknown> };
        }
      ).apiKeys.list();
      const data = raw as { data?: ApiKey[] };
      setState({ status: "ready", keys: data.data ?? [] });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ status: "error", error });
      onError?.(error);
    }
  }, [apiKey, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleScope = useCallback((scope: string) => {
    setForm((f) => ({
      ...f,
      scopes: f.scopes.includes(scope)
        ? f.scopes.filter((s) => s !== scope)
        : [...f.scopes, scope],
    }));
  }, []);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.name.trim() || creating) return;
      setCreating(true);
      try {
        const client = getClient(apiKey);
        const params: Record<string, unknown> = {
          name: form.name.trim(),
          scopes: form.scopes,
        };
        if (form.expires_at) params["expires_at"] = form.expires_at;
        if (form.isL2 && form.external_user_id) {
          params["external_user_id"] = form.external_user_id;
        }

        const endpoint = form.isL2 ? "createScoped" : "create";

        const raw = await (
          client as unknown as {
            apiKeys: Record<
              string,
              (p: Record<string, unknown>) => Promise<unknown>
            >;
          }
        ).apiKeys[endpoint]?.(params);

        const result = raw as { secret?: string };
        if (result.secret) {
          setRevealSecret(result.secret);
        }
        setForm(DEFAULT_FORM);
        await load();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
      } finally {
        setCreating(false);
      }
    },
    [form, creating, apiKey, load, onError],
  );

  const handleRevoke = useCallback(
    async (keyId: string) => {
      if (!window.confirm("Revoke this API key? This cannot be undone."))
        return;
      setRevokingId(keyId);
      try {
        const client = getClient(apiKey);
        await (
          client as unknown as {
            apiKeys: { revoke: (p: { id: string }) => Promise<unknown> };
          }
        ).apiKeys.revoke({ id: keyId });
        await load();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
      } finally {
        setRevokingId(null);
      }
    },
    [apiKey, load, onError],
  );

  const base = "miosa-akm";

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
      {/* Reveal modal */}
      {revealSecret && (
        <div
          className={`${base}__modal-overlay`}
          role="dialog"
          aria-modal="true"
          aria-label="API key created"
        >
          <div className={`${base}__modal`}>
            <h3 className={`${base}__modal-title`}>API key created</h3>
            <p className={`${base}__modal-hint`}>
              Copy this secret now — it will not be shown again.
            </p>
            <code className={`${base}__secret`}>{revealSecret}</code>
            <button
              type="button"
              className={`${base}__copy-btn`}
              onClick={() => {
                void navigator.clipboard.writeText(revealSecret);
              }}
              aria-label="Copy secret to clipboard"
            >
              Copy
            </button>
            <button
              type="button"
              className={`${base}__modal-close`}
              onClick={() => setRevealSecret(null)}
              aria-label="Close"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      <form
        className={`${base}__create`}
        onSubmit={handleCreate}
        aria-label="Create API key"
      >
        <h3 className={`${base}__form-title`}>New API key</h3>
        <input
          type="text"
          className={`${base}__input`}
          placeholder="Key name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          aria-label="Key name"
          required
        />

        <label className={`${base}__label`}>
          <input
            type="checkbox"
            checked={form.isL2}
            onChange={(e) => setForm((f) => ({ ...f, isL2: e.target.checked }))}
            aria-label="Scoped (L2) key"
          />{" "}
          Scoped (L2) — bound to an external user
        </label>

        {form.isL2 && (
          <input
            type="text"
            className={`${base}__input`}
            placeholder="external_user_id"
            value={form.external_user_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, external_user_id: e.target.value }))
            }
            aria-label="External user ID"
          />
        )}

        <div className={`${base}__scopes`} role="group" aria-label="Scopes">
          {ALL_SCOPES.map((scope) => (
            <label key={scope} className={`${base}__scope-label`}>
              <input
                type="checkbox"
                checked={form.scopes.includes(scope)}
                onChange={() => toggleScope(scope)}
                aria-label={scope}
              />{" "}
              {scope}
            </label>
          ))}
        </div>

        <input
          type="datetime-local"
          className={`${base}__input`}
          value={form.expires_at}
          onChange={(e) =>
            setForm((f) => ({ ...f, expires_at: e.target.value }))
          }
          aria-label="Expiration date (optional)"
          title="Expiration date (optional)"
        />

        <button
          type="submit"
          className={`${base}__create-btn`}
          disabled={creating}
          aria-label="Create API key"
        >
          {creating ? "Creating…" : "Create key"}
        </button>
      </form>

      {/* Key list */}
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
        <ul className={`${base}__list`} role="list" aria-label="API keys">
          {state.keys.map((k) => (
            <li key={k.id} className={`${base}__item`}>
              <div className={`${base}__item-info`}>
                <span className={`${base}__item-name`}>{k.name}</span>
                <code className={`${base}__item-last4`}>…{k.last4}</code>
                {k.external_user_id && (
                  <span className={`${base}__item-badge`}>L2</span>
                )}
              </div>
              <div className={`${base}__item-scopes`}>
                {k.scopes.map((s) => (
                  <span key={s} className={`${base}__scope-chip`}>
                    {s}
                  </span>
                ))}
              </div>
              <div className={`${base}__item-meta`}>
                <span>
                  Created {new Date(k.created_at).toLocaleDateString()}
                </span>
                {k.last_used_at && (
                  <span>
                    Last used {new Date(k.last_used_at).toLocaleDateString()}
                  </span>
                )}
                {k.expires_at && (
                  <span>
                    Expires {new Date(k.expires_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <button
                type="button"
                className={`${base}__revoke-btn`}
                onClick={() => void handleRevoke(k.id)}
                disabled={revokingId === k.id}
                aria-label={`Revoke ${k.name}`}
              >
                {revokingId === k.id ? "…" : "Revoke"}
              </button>
            </li>
          ))}
          {state.keys.length === 0 && (
            <li className={`${base}__empty`}>No API keys yet.</li>
          )}
        </ul>
      )}
    </div>
  );
}
