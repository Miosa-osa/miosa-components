/**
 * Example: compile-check only (not runnable without a real sandbox/API key).
 * Demonstrates every exported component typechecks correctly.
 */
import React from "react";
import {
  MiosaPreview,
  MiosaTerminal,
  MiosaFileTree,
  MiosaCodeEditor,
  MiosaUsage,
  MiosaShareButton,
  MiosaThemeProvider,
  type FileNode,
} from "@miosa/react";

const SANDBOX_ID = "sb_example123";
const API_KEY = process.env["MIOSA_API_KEY"] ?? "";

export default function App(): React.ReactElement {
  function handleFileSelect(file: FileNode): void {
    console.log("selected:", file.path);
  }

  return (
    <MiosaThemeProvider theme="dark" injectStyles>
      <div style={{ display: "grid", gap: 16, padding: 24, maxWidth: 1200 }}>
        <h1>@miosa/react example</h1>

        {/* 1. Preview — uses a pre-minted read-only token */}
        <section style={{ height: 400 }}>
          <h2>Preview (token)</h2>
          <MiosaPreview
            sandboxId={SANDBOX_ID}
            previewToken="preview_tok_abc"
            theme="dark"
            onError={(e) => console.error("preview error", e)}
          />
        </section>

        {/* 2. Preview — fetches token via API key */}
        <section style={{ height: 400 }}>
          <h2>Preview (apiKey)</h2>
          <MiosaPreview sandboxId={SANDBOX_ID} apiKey={API_KEY} theme="light" />
        </section>

        {/* 3. Terminal */}
        <section style={{ height: 320 }}>
          <h2>Terminal</h2>
          <MiosaTerminal
            sandboxId={SANDBOX_ID}
            apiKey={API_KEY}
            theme="dark"
            onResize={(cols, rows) => console.log("resize", cols, rows)}
            onError={(e) => console.error("terminal error", e)}
          />
        </section>

        {/* 4. File tree */}
        <section style={{ height: 400 }}>
          <h2>File Tree</h2>
          <MiosaFileTree
            sandboxId={SANDBOX_ID}
            apiKey={API_KEY}
            onSelect={handleFileSelect}
            showHidden={false}
            defaultExpanded={["/workspace/src"]}
          />
        </section>

        {/* 5. Code editor (optional — requires @monaco-editor/react) */}
        <section style={{ height: 400 }}>
          <h2>Code Editor</h2>
          <MiosaCodeEditor
            file="src/index.ts"
            content="export const hello = 'world';\n"
            language="typescript"
            readOnly={false}
            onChange={(val) => console.log("changed", val.length)}
          />
        </section>

        {/* 6. Usage */}
        <section>
          <h2>Usage</h2>
          <MiosaUsage
            externalUserId="user_demo"
            apiKey={API_KEY}
            period="30d"
            theme="dark"
          />
        </section>

        {/* 7. Share button */}
        <section>
          <h2>Share</h2>
          <MiosaShareButton
            sandboxId={SANDBOX_ID}
            apiKey={API_KEY}
            expiresIn={3600}
            onShare={(url) => console.log("shared:", url)}
          />
        </section>
      </div>
    </MiosaThemeProvider>
  );
}
