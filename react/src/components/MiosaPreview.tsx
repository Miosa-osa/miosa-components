import React, { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn.js";
import { getClient } from "../utils/client.js";
import type { MiosaAuth, MiosaBaseProps } from "../types.js";

export type MiosaPreviewProps = MiosaBaseProps &
  MiosaAuth & {
    sandboxId: string;
  };

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; error: Error };

export function MiosaPreview({
  sandboxId,
  previewToken,
  apiKey,
  theme = "dark",
  onError,
  className,
}: MiosaPreviewProps): React.ReactElement {
  const [state, setState] = useState<State>({ status: "idle" });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setState({ status: "loading" });

    let cancelled = false;

    async function resolve(): Promise<void> {
      try {
        if (previewToken) {
          // Consumer supplied a pre-minted token — build the iframe URL directly.
          // The platform embeds at: https://preview.miosa.ai/{sandboxId}?mt={token}
          const url = `https://preview.miosa.ai/${encodeURIComponent(sandboxId)}?mt=${encodeURIComponent(previewToken)}`;
          if (!cancelled) setState({ status: "ready", url });
          return;
        }

        if (!apiKey) return;
        const client = getClient(apiKey);
        // Fetch sandbox to get its preview URL / slug
        const sandbox = await client.sandboxes.get(sandboxId);
        // The API returns a preview_url field on the sandbox object
        const raw = sandbox as unknown as Record<string, unknown>;
        const previewUrl =
          typeof raw["preview_url"] === "string"
            ? raw["preview_url"]
            : `https://preview.miosa.ai/${encodeURIComponent(sandboxId)}`;
        if (!cancelled) setState({ status: "ready", url: previewUrl });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (!cancelled) {
          setState({ status: "error", error });
          onError?.(error);
        }
      }
    }

    void resolve();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [sandboxId, previewToken, apiKey, onError]);

  const base = "miosa-preview";

  if (state.status === "error") {
    return (
      <div
        className={cn(base, `${base}--error`, `${base}--${theme}`, className)}
        role="alert"
      >
        <span className={`${base}__error-text`}>
          Preview unavailable: {state.error.message}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(base, `${base}--${theme}`, className)}
      data-miosa-theme={theme}
    >
      {state.status !== "ready" && (
        <div className={`${base}__skeleton`} aria-label="Loading preview" />
      )}
      {state.status === "ready" && (
        <iframe
          src={state.url}
          className={`${base}__frame`}
          title="Sandbox preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          loading="lazy"
        />
      )}
    </div>
  );
}
