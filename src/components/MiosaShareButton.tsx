import React, { useCallback, useState } from "react";
import { cn } from "../utils/cn.js";
import { getClient } from "../utils/client.js";
import type { MiosaBaseProps } from "../types.js";

export interface MiosaShareButtonProps extends MiosaBaseProps {
  sandboxId: string;
  apiKey: string;
  /** Called with the generated share URL after copy */
  onShare?: (url: string) => void;
  /** How long the share link stays valid in seconds. Default: 3600 */
  expiresIn?: number;
}

type ButtonState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "copied"; url: string }
  | { status: "error"; error: Error };

export function MiosaShareButton({
  sandboxId,
  apiKey,
  theme = "dark",
  onShare,
  onError,
  expiresIn = 3600,
  className,
}: MiosaShareButtonProps): React.ReactElement {
  const [state, setState] = useState<ButtonState>({ status: "idle" });

  const handleClick = useCallback(async () => {
    if (state.status === "loading") return;
    setState({ status: "loading" });

    try {
      const client = getClient(apiKey);
      const sandbox = await client.sandboxes.get(sandboxId);
      const raw = sandbox as unknown as Record<string, unknown>;
      const shareResource = raw["share"] as
        | { create: (opts: Record<string, unknown>) => Promise<unknown> }
        | undefined;

      let url: string;
      if (shareResource?.create) {
        const result = (await shareResource.create({
          expires_in: expiresIn,
        })) as Record<string, unknown>;
        url = String(result["url"] ?? result["share_url"] ?? "");
      } else {
        // Fallback: construct preview URL directly
        url = `https://preview.miosa.ai/${encodeURIComponent(sandboxId)}`;
      }

      await navigator.clipboard.writeText(url);
      setState({ status: "copied", url });
      onShare?.(url);

      // Reset to idle after 2 s
      setTimeout(() => setState({ status: "idle" }), 2000);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ status: "error", error });
      onError?.(error);
      setTimeout(() => setState({ status: "idle" }), 3000);
    }
  }, [sandboxId, apiKey, expiresIn, onShare, onError, state.status]);

  const label =
    state.status === "loading"
      ? "Generating link…"
      : state.status === "copied"
        ? "Copied!"
        : state.status === "error"
          ? "Error — retry"
          : "Share";

  return (
    <button
      type="button"
      className={cn(
        "miosa-share-btn",
        `miosa-share-btn--${theme}`,
        state.status === "copied" && "miosa-share-btn--copied",
        state.status === "error" && "miosa-share-btn--error",
        className,
      )}
      onClick={() => void handleClick()}
      disabled={state.status === "loading"}
      aria-label={label}
      aria-busy={state.status === "loading"}
      data-miosa-theme={theme}
    >
      <span className="miosa-share-btn__icon" aria-hidden="true">
        {state.status === "copied"
          ? "✓"
          : state.status === "loading"
            ? "…"
            : "↗"}
      </span>
      <span className="miosa-share-btn__label">{label}</span>
    </button>
  );
}
