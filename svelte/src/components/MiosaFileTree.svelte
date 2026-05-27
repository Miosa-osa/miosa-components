<script lang="ts">
  import { Miosa } from "@miosa/sdk";
  import { createEventDispatcher, onDestroy, onMount } from "svelte";

  interface FileNode {
    name: string;
    path: string;
    type: "file" | "dir";
    children?: FileNode[];
    expanded: boolean;
  }

  interface Props {
    sandboxId: string;
    apiKey: string;
    showHidden?: boolean;
    defaultExpanded?: boolean;
  }

  let { sandboxId, apiKey, showHidden = false, defaultExpanded = false }: Props = $props();

  const dispatch = createEventDispatcher<{
    select: string;
    change: { path: string; type: "created" | "deleted" | "modified" };
  }>();

  let tree = $state<FileNode[]>([]);
  let loading = $state(true);
  let error = $state<Error | null>(null);

  function buildTree(entries: { path: string; type: string }[]): FileNode[] {
    const root: FileNode[] = [];
    for (const entry of entries) {
      const parts = entry.path.replace(/^\//, "").split("/");
      if (!showHidden && parts.some((p) => p.startsWith("."))) continue;
      let nodes = root;
      for (let i = 0; i < parts.length; i++) {
        const name = parts[i];
        let node = nodes.find((n) => n.name === name);
        if (!node) {
          node = {
            name,
            path: "/" + parts.slice(0, i + 1).join("/"),
            type: i === parts.length - 1 ? (entry.type as "file" | "dir") : "dir",
            expanded: defaultExpanded,
          };
          if (node.type === "dir") node.children = [];
          nodes.push(node);
        }
        if (node.children) nodes = node.children;
      }
    }
    return root;
  }

  async function loadFiles() {
    loading = true;
    error = null;
    try {
      const client = new Miosa({ apiKey });
      const sandbox = await client.sandboxes.get(sandboxId);
      const result = await (sandbox as any).files.list("/workspace");
      tree = buildTree(result.entries ?? result ?? []);
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
    } finally {
      loading = false;
    }
  }

  function toggleDir(node: FileNode) {
    if (node.type === "dir") node.expanded = !node.expanded;
  }

  // Flatten tree for rendering to avoid recursive components
  function flattenTree(nodes: FileNode[], depth = 0): Array<{ node: FileNode; depth: number }> {
    const result: Array<{ node: FileNode; depth: number }> = [];
    for (const node of nodes) {
      result.push({ node, depth });
      if (node.type === "dir" && node.expanded && node.children) {
        result.push(...flattenTree(node.children, depth + 1));
      }
    }
    return result;
  }

  let flatNodes = $derived(flattenTree(tree));

  onMount(loadFiles);
  onDestroy(() => {});
</script>

<div class="miosa-filetree" role="tree" aria-label="File tree">
  {#if loading}
    <div class="miosa-filetree__state">Loading…</div>
  {:else if error}
    <div class="miosa-filetree__state miosa-filetree__state--error" role="alert">
      {error.message}
    </div>
  {:else}
    {#each flatNodes as { node, depth } (node.path)}
      <div
        class="miosa-filetree__node"
        style={`padding-left: ${depth * 12 + 8}px`}
        role="treeitem"
        aria-selected="false"
        aria-expanded={node.type === "dir" ? node.expanded : undefined}
      >
        <button
          class={`miosa-filetree__label${node.type === "dir" ? " miosa-filetree__label--dir" : ""}`}
          aria-label={node.name}
          onclick={() => {
            if (node.type === "dir") toggleDir(node);
            else dispatch("select", node.path);
          }}
        >
          <span class="miosa-filetree__icon">
            {node.type === "dir" ? (node.expanded ? "▾" : "▸") : "·"}
          </span>
          <span>{node.name}</span>
        </button>
      </div>
    {/each}
  {/if}
</div>

<style>
  .miosa-filetree {
    font-family: JetBrains Mono, Menlo, monospace;
    font-size: 13px;
    color: #ccc;
    background: #111;
    border-radius: 6px;
    padding: 8px;
    overflow-y: auto;
  }
  .miosa-filetree__state {
    color: #888;
    padding: 8px;
  }
  .miosa-filetree__state--error {
    color: #e05c5c;
  }
  .miosa-filetree__node {
    box-sizing: border-box;
  }
  .miosa-filetree__label {
    display: flex;
    gap: 6px;
    align-items: center;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
    width: 100%;
    text-align: left;
    font: inherit;
  }
  .miosa-filetree__label:hover {
    background: rgba(255, 255, 255, 0.07);
  }
  .miosa-filetree__label--dir {
    color: #7eb8f7;
  }
  .miosa-filetree__icon {
    width: 12px;
  }
</style>
