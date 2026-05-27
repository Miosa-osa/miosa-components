<script setup lang="ts">
import { Miosa } from "@miosa/sdk";
import { onMounted, onUnmounted, ref } from "vue";

const props = withDefaults(
  defineProps<{
    sandboxId: string;
    apiKey: string;
    theme?: "light" | "dark";
  }>(),
  { theme: "dark" },
);

const emit = defineEmits<{
  resize: [cols: number, rows: number];
  error: [err: Error];
}>();

const containerRef = ref<HTMLDivElement | null>(null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let terminal: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fitAddon: any = null;
let ws: WebSocket | null = null;

async function initTerminal() {
  if (!containerRef.value) return;
  try {
    const xtermId = "xterm";
    const fitId = "xterm-addon-fit";
    const [{ Terminal }, { FitAddon }] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      import(/* @vite-ignore */ xtermId) as Promise<any>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      import(/* @vite-ignore */ fitId) as Promise<any>,
    ]);
    terminal = new Terminal({
      theme: props.theme === "light" ? { background: "#ffffff", foreground: "#333" } : undefined,
      cursorBlink: true,
      fontFamily: "JetBrains Mono, Menlo, monospace",
    });
    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.value);
    fitAddon.fit();

    const client = new Miosa({ apiKey: props.apiKey });
    const sandbox = await client.sandboxes.get(props.sandboxId);
    const token = await (sandbox as any).previewToken(3600, "terminal");

    ws = new WebSocket(
      `wss://preview.miosa.app/${props.sandboxId}/terminal?token=${token.token}`,
    );
    ws.onmessage = (ev) => terminal?.write(ev.data as string);
    ws.onerror = () => emit("error", new Error("Terminal WebSocket error"));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    terminal.onData((data: any) => ws?.send(data));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    terminal.onResize(({ cols, rows }: any) => {
      ws?.send(JSON.stringify({ type: "resize", cols, rows }));
      emit("resize", cols, rows);
    });

    const ro = new ResizeObserver(() => fitAddon?.fit());
    ro.observe(containerRef.value);
  } catch (e) {
    emit("error", e instanceof Error ? e : new Error(String(e)));
  }
}

onMounted(initTerminal);
onUnmounted(() => {
  ws?.close();
  terminal?.dispose();
});
</script>

<template>
  <div
    ref="containerRef"
    :class="['miosa-terminal', `miosa-terminal--${theme}`]"
    role="region"
    aria-label="Sandbox terminal"
  />
</template>

<style scoped>
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
