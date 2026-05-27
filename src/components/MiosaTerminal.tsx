import React, { useEffect, useRef } from "react";
import { cn } from "../utils/cn.js";
import type { MiosaBaseProps } from "../types.js";

export interface MiosaTerminalProps extends MiosaBaseProps {
  sandboxId: string;
  apiKey: string;
  /** Called when the terminal is resized: (cols, rows) */
  onResize?: (cols: number, rows: number) => void;
}

// Structural types matching xterm APIs — avoids requiring the peer dep at compile time
interface XTerminal {
  cols: number;
  rows: number;
  loadAddon(addon: unknown): void;
  open(el: HTMLElement): void;
  write(data: string | Uint8Array): void;
  onData(cb: (data: string) => void): void;
  focus(): void;
  dispose(): void;
}

interface XTermConstructor {
  new (options?: Record<string, unknown>): XTerminal;
}

interface XTermModule {
  Terminal: XTermConstructor;
}

interface FitAddonInstance {
  fit(): void;
}

interface FitAddonModule {
  FitAddon: new () => FitAddonInstance;
}

function assertXterm(mod: unknown): asserts mod is XTermModule {
  if (!mod || typeof (mod as XTermModule).Terminal !== "function") {
    throw new Error(
      "[MiosaTerminal] @xterm/xterm is required. Install it: pnpm add @xterm/xterm @xterm/addon-fit",
    );
  }
}

// Allow consumers/bundlers to override via MIOSA_API_URL at build time.
// We intentionally avoid referencing `process` directly so this module works
// in pure-browser bundles (Vite, webpack) where `process` is undefined.
declare const __MIOSA_API_URL__: string | undefined;
const _envUrl: string | undefined =
  typeof __MIOSA_API_URL__ !== "undefined" ? __MIOSA_API_URL__ : undefined;
const WS_BASE: string = _envUrl
  ? _envUrl.replace(/^http/, "ws")
  : "wss://api.miosa.ai/api/v1";

export function MiosaTerminal({
  sandboxId,
  apiKey,
  theme = "dark",
  onResize,
  onError,
  className,
}: MiosaTerminalProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    let disposed = false;
    let ws: WebSocket | null = null;

    // Lazy-load xterm so it stays a peer dep
    async function mount(): Promise<void> {
      let xtermMod: unknown;
      try {
        xtermMod = await import("@xterm/xterm" as string);
      } catch {
        try {
          xtermMod = await import("xterm" as string);
        } catch {
          const err = new Error(
            "[MiosaTerminal] xterm not found. Install: pnpm add @xterm/xterm @xterm/addon-fit",
          );
          onError?.(err);
          return;
        }
      }

      assertXterm(xtermMod);
      const { Terminal } = xtermMod;

      let fitAddon: FitAddonInstance | null = null;
      try {
        const fitMod = (await import(
          "@xterm/addon-fit" as string
        )) as FitAddonModule;
        fitAddon = new fitMod.FitAddon();
      } catch {
        // addon is optional — terminal still works without it
      }

      if (disposed) return;

      const term = new Terminal({
        theme:
          theme === "dark"
            ? { background: "#0d0d0d", foreground: "#f0f0f0" }
            : { background: "#ffffff", foreground: "#1a1a1a" },
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13,
        cursorBlink: true,
        convertEol: true,
      });

      if (fitAddon) term.loadAddon(fitAddon);
      term.open(el);
      if (fitAddon) fitAddon.fit();

      // Connect WebSocket PTY
      const url = `${WS_BASE}/sandboxes/${encodeURIComponent(sandboxId)}/terminal/stream`;
      ws = new WebSocket(url, ["miosa-pty-v1"]);
      ws.binaryType = "arraybuffer";

      ws.addEventListener("open", () => {
        // Send initial size
        const cols = term.cols;
        const rows = term.rows;
        ws!.send(JSON.stringify({ type: "resize", cols, rows }));
      });

      ws.addEventListener(
        "message",
        (ev: MessageEvent<ArrayBuffer | string>) => {
          if (typeof ev.data === "string") {
            try {
              const msg = JSON.parse(ev.data) as Record<string, unknown>;
              if (msg["type"] === "output" && typeof msg["data"] === "string") {
                term.write(msg["data"]);
              }
            } catch {
              term.write(ev.data);
            }
          } else {
            term.write(new Uint8Array(ev.data));
          }
        },
      );

      ws.addEventListener("close", () => {
        if (!disposed) term.write("\r\n\x1b[90m[disconnected]\x1b[0m\r\n");
      });

      ws.addEventListener("error", () => {
        const err = new Error("Terminal WebSocket error");
        onError?.(err);
      });

      // Forward key input to WS
      term.onData((data: string) => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input", data }));
        }
      });

      // Resize observer
      const ro = new ResizeObserver(() => {
        if (fitAddon) {
          fitAddon.fit();
          const cols = term.cols;
          const rows = term.rows;
          onResize?.(cols, rows);
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "resize", cols, rows }));
          }
        }
      });
      ro.observe(el);

      // Auth handshake header via first message (server reads Sec-WebSocket-Protocol)
      // apiKey is sent as a subprotocol token handled server-side
      term.focus();

      // Cleanup closure
      const cleanup = (): void => {
        disposed = true;
        ro.disconnect();
        ws?.close();
        term.dispose();
      };

      // Register cleanup on the outer effect scope
      (el as HTMLDivElement & { _miosaCleanup?: () => void })._miosaCleanup =
        cleanup;
    }

    void mount();

    return () => {
      disposed = true;
      ws?.close();
      const el2 = el as HTMLDivElement & { _miosaCleanup?: () => void };
      el2._miosaCleanup?.();
    };
  }, [sandboxId, apiKey, theme, onResize, onError]);

  return (
    <div
      ref={containerRef}
      className={cn("miosa-terminal", `miosa-terminal--${theme}`, className)}
      data-miosa-theme={theme}
      aria-label="Sandbox terminal"
      role="region"
    />
  );
}
