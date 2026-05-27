import React, { lazy, Suspense } from "react";
import { cn } from "../utils/cn.js";
import type { MiosaBaseProps } from "../types.js";

export interface MiosaCodeEditorProps extends MiosaBaseProps {
  file?: string;
  content: string;
  language?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

/**
 * Optional Monaco-based code editor.
 *
 * Requires the consumer to install `@monaco-editor/react`:
 *   pnpm add @monaco-editor/react
 *
 * Import this component only when you have Monaco installed; otherwise it will
 * throw a descriptive error at mount time rather than at import time.
 */

// Lazy-load Monaco so it never enters the main bundle when unused
const MonacoEditor = lazy(async () => {
  let mod: { default: React.ComponentType<Record<string, unknown>> };
  try {
    mod = (await import("@monaco-editor/react" as string)) as typeof mod;
  } catch {
    throw new Error(
      "[MiosaCodeEditor] @monaco-editor/react is not installed.\n" +
        "Install it: pnpm add @monaco-editor/react",
    );
  }
  return { default: mod.default };
});

function EditorSkeleton({ theme }: { theme: string }): React.ReactElement {
  return (
    <div
      className={cn(
        "miosa-code-editor__loading",
        `miosa-code-editor__loading--${theme}`,
      )}
      aria-label="Loading editor"
      role="status"
    />
  );
}

export function MiosaCodeEditor({
  file,
  content,
  language,
  onChange,
  readOnly = false,
  theme = "dark",
  onError,
  className,
}: MiosaCodeEditorProps): React.ReactElement {
  const monacoTheme = theme === "dark" ? "vs-dark" : "light";

  // Detect language from file extension when not provided
  const detectedLanguage =
    language ?? (file ? detectLanguage(file) : "plaintext");

  return (
    <div
      className={cn(
        "miosa-code-editor",
        `miosa-code-editor--${theme}`,
        className,
      )}
      data-miosa-theme={theme}
    >
      <Suspense fallback={<EditorSkeleton theme={theme} />}>
        <MonacoErrorBoundary onError={onError}>
          <MonacoEditor
            height="100%"
            language={detectedLanguage}
            value={content}
            theme={monacoTheme}
            options={{
              readOnly,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
            }}
            onChange={(val: unknown) => {
              if (typeof val === "string") onChange?.(val);
            }}
          />
        </MonacoErrorBoundary>
      </Suspense>
    </div>
  );
}

function detectLanguage(file: string): string {
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    ex: "elixir",
    exs: "elixir",
    json: "json",
    md: "markdown",
    css: "css",
    html: "html",
    sh: "shell",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    sql: "sql",
  };
  return map[ext] ?? "plaintext";
}

interface MonacoErrorBoundaryProps {
  children: React.ReactNode;
  onError?: ((err: Error) => void) | undefined;
}

interface MonacoErrorBoundaryState {
  error: Error | null;
}

class MonacoErrorBoundary extends React.Component<
  MonacoErrorBoundaryProps,
  MonacoErrorBoundaryState
> {
  constructor(props: MonacoErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): MonacoErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    this.props.onError?.(error);
  }

  override render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className="miosa-code-editor__error" role="alert">
          <pre className="miosa-code-editor__error-text">
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
