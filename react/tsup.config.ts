import { copyFileSync } from "fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    "react",
    "react-dom",
    "@monaco-editor/react",
    "xterm",
    "@xterm/xterm",
    "@xterm/addon-fit",
  ],
  define: {
    // Allows bundler overrides; falls back to undefined at runtime
    __MIOSA_API_URL__: "undefined",
  },
  async onSuccess() {
    copyFileSync("src/styles.css", "dist/styles.css");
  },
  // "use client" directive is ESM-only — added per-format below
  esbuildOptions(options, context) {
    if (context.format === "esm") {
      options.banner = { js: '"use client";' };
    }
  },
});
