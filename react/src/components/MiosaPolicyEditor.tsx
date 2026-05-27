import React, { useCallback, useEffect, useReducer, useState } from "react";
import { cn } from "../utils/cn.js";
import { getClient } from "../utils/client.js";
import type { MiosaBaseProps } from "../types.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PolicyScope = "tenant" | "workspace" | "user";

interface PolicyField<T> {
  value: T;
  source: "user" | "workspace" | "tenant" | "platform";
}

type EffectivePolicy = Record<string, Record<string, PolicyField<unknown>>>;
type PolicyDraft = Record<string, Record<string, unknown>>;

export interface MiosaPolicyEditorProps extends MiosaBaseProps {
  scope: PolicyScope;
  id?: string;
  onSave?: (policy: PolicyDraft) => void;
  apiKey: string;
  unstyled?: boolean;
  style?: React.CSSProperties;
}

// Concrete SDK shape used by this component
interface PolicySdkClient {
  tenant: {
    policy: () => Promise<unknown>;
    setPolicy: (p: unknown) => Promise<unknown>;
  };
  workspaces: {
    getPolicy: (p: { id: string }) => Promise<unknown>;
    setPolicy: (p: { id: string; policy: unknown }) => Promise<unknown>;
  };
  externalUsers: {
    effectivePolicy: (p: { external_user_id: string }) => Promise<unknown>;
    setPolicy: (p: {
      external_user_id: string;
      policy: unknown;
    }) => Promise<unknown>;
  };
}

function asPolicyApi(apiKey: string): PolicySdkClient {
  return getClient(apiKey) as unknown as PolicySdkClient;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "lifecycle",
  "quotas",
  "sizing",
  "templates",
  "features",
  "egress",
  "branding",
  "webhooks",
] as const;

function sourceLabel(source: string): string {
  if (source === "tenant") return "Inherited from tenant";
  if (source === "workspace") return "Inherited from workspace";
  if (source === "platform") return "Platform default";
  return "Set at this level";
}

function renderFieldValue(val: unknown): string {
  if (Array.isArray(val)) return val.join(", ") || "(empty)";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (val === null || val === undefined) return "(unset)";
  return String(val);
}

// ─── Section ─────────────────────────────────────────────────────────────────

function PolicySection({
  category,
  fields,
  overrides,
  onOverride,
  theme,
}: {
  category: string;
  fields: Record<string, PolicyField<unknown>>;
  overrides: Record<string, unknown>;
  onOverride: (key: string, value: unknown) => void;
  theme: string;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const pfx = "miosa-pe__section";

  return (
    <div className={cn(pfx, `${pfx}--${theme}`)}>
      <button
        className={`${pfx}-toggle`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className={`${pfx}-title`}>{category}</span>
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className={`${pfx}-body`}>
          {Object.entries(fields).map(([key, field]) => {
            const isInherited = field.source !== "user" && !(key in overrides);
            const overrideVal = overrides[key];
            return (
              <div key={key} className={`${pfx}-row`}>
                <div className={`${pfx}-meta`}>
                  <span className={`${pfx}-key`}>{key}</span>
                  <span className={`${pfx}-source`}>
                    {sourceLabel(field.source)}
                  </span>
                </div>
                <div className={`${pfx}-value`}>
                  {isInherited ? (
                    <span className={`${pfx}-inherited`}>
                      <s>{renderFieldValue(field.value)}</s>
                    </span>
                  ) : (
                    <FieldInput
                      fieldKey={key}
                      value={overrideVal ?? field.value}
                      onChange={(v) => onOverride(key, v)}
                    />
                  )}
                  <button
                    type="button"
                    className={`${pfx}-toggle-inherit`}
                    onClick={() => {
                      if (isInherited) {
                        onOverride(key, field.value);
                      } else {
                        onOverride(key, undefined);
                      }
                    }}
                    aria-label={
                      isInherited
                        ? `Override ${key}`
                        : `Revert ${key} to inherited`
                    }
                  >
                    {isInherited ? "Override" : "Revert"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FieldInput({
  fieldKey,
  value,
  onChange,
}: {
  fieldKey: string;
  value: unknown;
  onChange: (v: unknown) => void;
}): React.ReactElement {
  if (typeof value === "boolean") {
    return (
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={fieldKey}
      />
    );
  }
  if (Array.isArray(value)) {
    return (
      <input
        type="text"
        value={value.join(", ")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        aria-label={fieldKey}
        className="miosa-pe__input"
      />
    );
  }
  if (typeof value === "number") {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={fieldKey}
        className="miosa-pe__input"
      />
    );
  }
  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      aria-label={fieldKey}
      className="miosa-pe__input"
    />
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

type State =
  | { status: "loading" }
  | { status: "ready"; effective: EffectivePolicy }
  | { status: "error"; error: Error };

export function MiosaPolicyEditor({
  scope,
  id,
  apiKey,
  theme = "dark",
  onSave,
  onError,
  className,
  style,
  unstyled = false,
}: MiosaPolicyEditorProps): React.ReactElement {
  const [state, setState] = useState<State>({ status: "loading" });
  const [overrides, dispatch] = useReducer(
    (
      s: PolicyDraft,
      a:
        | { type: "set"; cat: string; key: string; value: unknown }
        | { type: "reset" },
    ) => {
      if (a.type === "reset") return {};
      const cat = s[a.cat] ?? {};
      if (a.value === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [a.key]: _removed, ...rest } = cat;
        return { ...s, [a.cat]: rest };
      }
      return { ...s, [a.cat]: { ...cat, [a.key]: a.value } };
    },
    {},
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    dispatch({ type: "reset" });

    async function load(): Promise<void> {
      try {
        const c = asPolicyApi(apiKey);
        let raw: unknown;
        if (scope === "tenant") {
          raw = await c.tenant.policy();
        } else if (scope === "workspace" && id) {
          raw = await c.workspaces.getPolicy({ id });
        } else if (scope === "user" && id) {
          raw = await c.externalUsers.effectivePolicy({ external_user_id: id });
        } else {
          raw = {};
        }
        if (!cancelled)
          setState({ status: "ready", effective: raw as EffectivePolicy });
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
  }, [scope, id, apiKey, onError]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const c = asPolicyApi(apiKey);
      if (scope === "tenant") {
        await c.tenant.setPolicy(overrides);
      } else if (scope === "workspace" && id) {
        await c.workspaces.setPolicy({ id, policy: overrides });
      } else if (scope === "user" && id) {
        await c.externalUsers.setPolicy({
          external_user_id: id,
          policy: overrides,
        });
      }
      onSave?.(overrides);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
    } finally {
      setSaving(false);
    }
  }, [apiKey, scope, id, overrides, onSave, onError, saving]);

  const base = "miosa-pe";

  if (state.status === "loading") {
    return (
      <div
        className={cn(!unstyled && base, className)}
        style={style}
        aria-busy="true"
        aria-label="Loading policy"
      >
        <div className={`${base}__skeleton`} />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className={cn(
          !unstyled && base,
          !unstyled && `${base}--error`,
          className,
        )}
        style={style}
        role="alert"
      >
        {state.error.message}
      </div>
    );
  }

  const { effective } = state;

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
      <div className={`${base}__layout`}>
        <div className={`${base}__sections`}>
          {CATEGORIES.map((cat) => {
            const fields = effective[cat] as
              | Record<string, PolicyField<unknown>>
              | undefined;
            if (!fields) return null;
            return (
              <PolicySection
                key={cat}
                category={cat}
                fields={fields}
                overrides={(overrides[cat] ?? {}) as Record<string, unknown>}
                onOverride={(key, value) =>
                  dispatch({ type: "set", cat, key, value })
                }
                theme={theme}
              />
            );
          })}
        </div>
        <div
          className={`${base}__preview`}
          aria-label="Effective policy preview"
        >
          <h3 className={`${base}__preview-title`}>Effective policy</h3>
          <pre className={`${base}__preview-json`}>
            {JSON.stringify(
              Object.fromEntries(
                CATEGORIES.map((cat) => [
                  cat,
                  Object.fromEntries(
                    Object.entries(effective[cat] ?? {}).map(([k, f]) => [
                      k,
                      (overrides[cat] as Record<string, unknown> | undefined)?.[
                        k
                      ] ?? (f as PolicyField<unknown>).value,
                    ]),
                  ),
                ]),
              ),
              null,
              2,
            )}
          </pre>
        </div>
      </div>
      <div className={`${base}__actions`}>
        <button
          type="button"
          className={`${base}__save-btn`}
          onClick={handleSave}
          disabled={saving}
          aria-label="Save policy"
        >
          {saving ? "Saving…" : "Save policy"}
        </button>
      </div>
    </div>
  );
}
