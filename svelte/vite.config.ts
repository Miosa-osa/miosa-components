import { resolve } from "path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte({ compilerOptions: { runes: true } })],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "MiosaSvelte",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: (id) =>
        [
          "svelte",
          "@miosa/sdk",
          "xterm",
          "xterm-addon-fit",
          "monaco-editor",
        ].includes(id) ||
        id.startsWith("xterm") ||
        id.startsWith("svelte/"),
    },
  },
});
