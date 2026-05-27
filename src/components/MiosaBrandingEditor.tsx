import React, { useCallback, useEffect, useState } from "react";
import { cn } from "../utils/cn.js";
import { getClient } from "../utils/client.js";
import type { MiosaBaseProps } from "../types.js";

export interface MiosaBrandingEditorProps extends MiosaBaseProps {
  apiKey: string;
  unstyled?: boolean;
  style?: React.CSSProperties;
  onSave?: (branding: BrandingData) => void;
}

interface BrandingData {
  product_name?: string;
  logo_url?: string;
  support_url?: string;
  primary_color?: string;
  background_color?: string;
}

type State =
  | { status: "loading" }
  | { status: "ready"; branding: BrandingData }
  | { status: "error"; error: Error };

export function MiosaBrandingEditor({
  apiKey,
  theme = "dark",
  onError,
  onSave,
  className,
  style,
  unstyled = false,
}: MiosaBrandingEditorProps): React.ReactElement {
  const [state, setState] = useState<State>({ status: "loading" });
  const [draft, setDraft] = useState<BrandingData>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const client = getClient(apiKey);
        const raw = await (
          client as unknown as {
            tenant: { getBranding: () => Promise<unknown> };
          }
        ).tenant.getBranding();
        const data =
          (raw as { data?: BrandingData }).data ?? (raw as BrandingData);
        if (!cancelled) {
          setState({ status: "ready", branding: data });
          setDraft(data);
        }
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
  }, [apiKey, onError]);

  const set = useCallback(
    (key: keyof BrandingData, value: string) =>
      setDraft((d) => ({ ...d, [key]: value || undefined })),
    [],
  );

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (saving) return;
      setSaving(true);
      try {
        const client = getClient(apiKey);
        await (
          client as unknown as {
            tenant: { setBranding: (p: BrandingData) => Promise<unknown> };
          }
        ).tenant.setBranding(draft);
        onSave?.(draft);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
      } finally {
        setSaving(false);
      }
    },
    [apiKey, draft, onSave, onError, saving],
  );

  const base = "miosa-be";

  if (state.status === "loading") {
    return (
      <div
        className={cn(!unstyled && base, className)}
        style={style}
        aria-busy="true"
        aria-label="Loading branding"
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

  const previewStyle: React.CSSProperties = {
    background: draft.background_color ?? "#0d0d0d",
    padding: "24px",
    borderRadius: "8px",
    fontFamily: "system-ui, sans-serif",
    color: draft.primary_color ?? "#f0f0f0",
    minHeight: "120px",
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
      <div className={`${base}__layout`}>
        <form
          className={`${base}__form`}
          onSubmit={handleSave}
          aria-label="Branding settings"
        >
          {(
            [
              ["product_name", "Product name", "text"],
              ["logo_url", "Logo URL", "url"],
              ["support_url", "Support URL", "url"],
              ["primary_color", "Primary color", "color"],
              ["background_color", "Background color", "color"],
            ] as [keyof BrandingData, string, string][]
          ).map(([key, label, inputType]) => (
            <div key={key} className={`${base}__field`}>
              <label className={`${base}__label`} htmlFor={`miosa-be-${key}`}>
                {label}
              </label>
              <input
                id={`miosa-be-${key}`}
                type={inputType}
                className={`${base}__input`}
                value={draft[key] ?? ""}
                onChange={(e) => set(key, e.target.value)}
                aria-label={label}
              />
            </div>
          ))}
          <button
            type="submit"
            className={`${base}__save-btn`}
            disabled={saving}
            aria-label="Save branding"
          >
            {saving ? "Saving…" : "Save branding"}
          </button>
        </form>

        {/* Live preview */}
        <div className={`${base}__preview`} aria-label="Branding preview">
          <h3 className={`${base}__preview-title`}>Preview</h3>
          <div style={previewStyle} role="img" aria-label="Error page preview">
            {draft.logo_url && (
              <img
                src={draft.logo_url}
                alt="Logo"
                style={{ maxHeight: 40, marginBottom: 12 }}
              />
            )}
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              {draft.product_name ?? "Your Product"}
            </div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              Something went wrong. Contact{" "}
              {draft.support_url ? (
                <a
                  href={draft.support_url}
                  style={{ color: draft.primary_color }}
                >
                  support
                </a>
              ) : (
                "support"
              )}
              .
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
