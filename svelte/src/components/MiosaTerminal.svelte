<script lang="ts">
  import { Miosa } from "@miosa/sdk";
  import { createEventDispatcher, onDestroy, onMount } from "svelte";

  interface Props {
    sandboxId: string;
    apiKey: string;
    theme?: "light" | "dark";
  }

  let { sandboxId, apiKey, theme = "dark" }: Props = $props();

  const dispatch = createEventDispatcher<{
    resize: { cols: number; rows: number };
    error: Error;
  }>();

  let containerEl = $state<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let terminal: any = null;
  let ws: WebSocket | null = null;

  async function init() {
    if (!containerEl) return;
    try {
      const xtermId = "xterm";
      const fitId = "xterm-addon-fit";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import(/* @vite-ignore */ xtermId) as Promise<any>,
        import(/* @vite-ignore */ fitId) as Promise<any>,
      ]);
      terminal = new Terminal({
        theme: theme === "light" ? { background: "#ffffff", foreground: "#333" } : undefined,
        cursorBlink: true,
        fontFamily: "JetBrains Mono, Menlo, monospace",
      });
      const fit = new FitAddon();
      terminal.loadAddon(fit);
      terminal.open(containerEl);
      fit.fit();

      const client = new Miosa({ apiKey });
      const sandbox = await client.sandboxes.get(sandboxId);
      const token = await (sandbox as any).previewToken(3600, "terminal");

      ws = new WebSocket(
        `wss://preview.miosa.app/${sandboxId}/terminal?token=${token.token}`,
      );
      ws.onmessage = (ev) => terminal?.write(ev.data as string);
      ws.onerror = () => dispatch("error", new Error("Terminal WebSocket error"));

      terminal.onData((data: string) => ws?.send(data));
      terminal.onResize(({ cols, rows }: { cols: number; rows: number }) => {
        ws?.send(JSON.stringify({ type: "resize", cols, rows }));
        dispatch("resize", { cols, rows });
      });

      const ro = new ResizeObserver(() => fit.fit());
      ro.observe(containerEl);
    } catch (e) {
      dispatch("error", e instanceof Error ? e : new Error(String(e)));
    }
  }

  onMount(init);
  onDestroy(() => {
    ws?.close();
    terminal?.dispose();
  });
</script>

<div
  bind:this={containerEl}
  class={`miosa-terminal miosa-terminal--${theme}`}
  role="region"
  aria-label="Sandbox terminal"
></div>

<style>
  .miosa-terminal {
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 6px;
    background: #0d0d0d;
    padding: 4px;
    box-sizing: border-box;
  }
  .miosa-terminal--light {
    background: #ffffff;
  }
</style>
