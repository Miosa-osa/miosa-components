import { resolve } from "path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "MiosaVue",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: (id) =>
        [
          "vue",
          "@miosa/sdk",
          "xterm",
          "xterm-addon-fit",
          "monaco-editor",
        ].includes(id) || id.startsWith("xterm"),
      output: {
        globals: { vue: "Vue" },
      },
    },
  },
});
