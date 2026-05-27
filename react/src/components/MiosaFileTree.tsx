import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn.js";
import { getClient } from "../utils/client.js";
import type { MiosaBaseProps } from "../types.js";

export interface FileNode {
  path: string;
  name: string;
  type: "file" | "directory";
  children?: FileNode[];
}

export interface MiosaFileTreeProps extends MiosaBaseProps {
  sandboxId: string;
  apiKey: string;
  onSelect?: (file: FileNode) => void;
  onChange?: (tree: FileNode[]) => void;
  showHidden?: boolean;
  defaultExpanded?: string[];
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; tree: FileNode[] }
  | { status: "error"; error: Error };

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onSelect,
  theme,
}: {
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect?: ((file: FileNode) => void) | undefined;
  theme: string;
}): React.ReactElement {
  const isDir = node.type === "directory";
  const isOpen = expanded.has(node.path);

  return (
    <li
      className="miosa-file-tree__item"
      role="treeitem"
      aria-expanded={isDir ? isOpen : undefined}
    >
      <button
        className={cn(
          "miosa-file-tree__row",
          `miosa-file-tree__row--depth-${depth}`,
          isDir && "miosa-file-tree__row--dir",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (isDir) onToggle(node.path);
          else onSelect?.(node);
        }}
        aria-label={node.name}
        type="button"
      >
        <span className="miosa-file-tree__icon" aria-hidden="true">
          {isDir ? (isOpen ? "▾" : "▸") : "·"}
        </span>
        <span className="miosa-file-tree__name">{node.name}</span>
      </button>
      {isDir && isOpen && node.children && node.children.length > 0 && (
        <ul className="miosa-file-tree__children" role="group">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              theme={theme}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function normalizeTree(raw: unknown): FileNode[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item): FileNode => {
    const r = item as Record<string, unknown>;
    return {
      path: String(r["path"] ?? ""),
      name: String(r["name"] ?? r["path"] ?? ""),
      type: r["type"] === "directory" ? "directory" : "file",
      ...(r["children"] !== undefined
        ? { children: normalizeTree(r["children"]) }
        : {}),
    };
  });
}

export function MiosaFileTree({
  sandboxId,
  apiKey,
  theme = "dark",
  onSelect,
  onChange,
  showHidden = false,
  defaultExpanded = [],
  onError,
  className,
}: MiosaFileTreeProps): React.ReactElement {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(defaultExpanded),
  );
  const watchCleanupRef = useRef<(() => void) | null>(null);

  const load = useCallback(async () => {
    try {
      const client = getClient(apiKey);
      const sandbox = await client.sandboxes.get(sandboxId);
      const raw = sandbox as unknown as Record<string, unknown>;
      // files.tree is available via the files sub-resource
      const filesResource = raw["files"] as Record<string, unknown> | undefined;
      let tree: FileNode[] = [];
      if (filesResource && typeof filesResource["tree"] === "function") {
        const result = await (
          filesResource["tree"] as (opts: unknown) => Promise<unknown>
        )({
          path: "/workspace",
          depth: 4,
          show_hidden: showHidden,
        });
        tree = normalizeTree(result);
      }
      setState({ status: "ready", tree });
      onChange?.(tree);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ status: "error", error });
      onError?.(error);
    }
  }, [sandboxId, apiKey, showHidden, onChange, onError]);

  useEffect(() => {
    void load();

    // Subscribe to file watch events for live updates
    let cancelled = false;
    async function watch(): Promise<void> {
      try {
        const client = getClient(apiKey);
        const sandbox = await client.sandboxes.get(sandboxId);
        const raw = sandbox as unknown as Record<string, unknown>;
        const filesResource = raw["files"] as
          | Record<string, unknown>
          | undefined;
        if (filesResource && typeof filesResource["watch"] === "function") {
          const unwatch = await (
            filesResource["watch"] as (cb: () => void) => Promise<() => void>
          )(() => {
            if (!cancelled) void load();
          });
          watchCleanupRef.current = unwatch;
        }
      } catch {
        // watch is best-effort; failures don't surface as errors
      }
    }
    void watch();

    return () => {
      cancelled = true;
      watchCleanupRef.current?.();
    };
  }, [sandboxId, apiKey, load]);

  const handleToggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  if (state.status === "loading") {
    return (
      <div
        className={cn(
          "miosa-file-tree",
          `miosa-file-tree--${theme}`,
          className,
        )}
        aria-busy="true"
        aria-label="Loading file tree"
      >
        <div className="miosa-file-tree__skeleton" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className={cn(
          "miosa-file-tree",
          `miosa-file-tree--error`,
          `miosa-file-tree--${theme}`,
          className,
        )}
        role="alert"
      >
        <span className="miosa-file-tree__error-text">
          {state.error.message}
        </span>
      </div>
    );
  }

  return (
    <nav
      className={cn("miosa-file-tree", `miosa-file-tree--${theme}`, className)}
      aria-label="File tree"
      data-miosa-theme={theme}
    >
      <ul className="miosa-file-tree__root" role="tree">
        {state.tree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={handleToggle}
            onSelect={onSelect}
            theme={theme}
          />
        ))}
      </ul>
    </nav>
  );
}
