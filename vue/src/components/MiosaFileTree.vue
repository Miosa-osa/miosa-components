<script setup lang="ts">
import { Miosa } from "@miosa/sdk";
import { onMounted, onUnmounted, ref, watch } from "vue";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
  expanded?: boolean;
}

interface FlatNode {
  node: FileNode;
  depth: number;
}

const props = withDefaults(
  defineProps<{
    sandboxId: string;
    apiKey: string;
    showHidden?: boolean;
    defaultExpanded?: boolean;
  }>(),
  { showHidden: false, defaultExpanded: false },
);

const emit = defineEmits<{
  select: [path: string];
  change: [path: string, type: "created" | "deleted" | "modified"];
}>();

const flatNodes = ref<FlatNode[]>([]);
const loading = ref(true);
const error = ref<Error | null>(null);

function buildTree(entries: { path: string; type: string }[]): FileNode[] {
  const root: FileNode[] = [];
  for (const entry of entries) {
    const parts = entry.path.replace(/^\//, "").split("/");
    if (!props.showHidden && parts.some((p) => p.startsWith("."))) continue;
    let nodes = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      let node = nodes.find((n) => n.name === name);
      if (!node) {
        node = {
          name,
          path: "/" + parts.slice(0, i + 1).join("/"),
          type: i === parts.length - 1 ? (entry.type as "file" | "dir") : "dir",
          expanded: props.defaultExpanded,
        };
        if (node.type === "dir") node.children = [];
        nodes.push(node);
      }
      if (node.children) nodes = node.children;
    }
  }
  return root;
}

function flatten(nodes: FileNode[], depth = 0): FlatNode[] {
  const result: FlatNode[] = [];
  for (const node of nodes) {
    result.push({ node, depth });
    if (node.type === "dir" && node.expanded && node.children) {
      result.push(...flatten(node.children, depth + 1));
    }
  }
  return result;
}

let tree: FileNode[] = [];

function refreshFlat() {
  flatNodes.value = flatten(tree);
}

async function loadFiles() {
  loading.value = true;
  error.value = null;
  try {
    const client = new Miosa({ apiKey: props.apiKey });
    const sandbox = await client.sandboxes.get(props.sandboxId);
    const result = await (sandbox as any).files.list("/workspace");
    tree = buildTree(result.entries ?? result ?? []);
    refreshFlat();
  } catch (e) {
    error.value = e instanceof Error ? e : new Error(String(e));
  } finally {
    loading.value = false;
  }
}

function toggleDir(node: FileNode) {
  if (node.type === "dir") {
    node.expanded = !node.expanded;
    refreshFlat();
  }
}

onMounted(() => void loadFiles());
watch(() => props.sandboxId, loadFiles);
onUnmounted(() => {});
</script>

<template>
  <div class="miosa-filetree" role="tree" aria-label="File tree">
    <div v-if="loading" class="miosa-filetree__state">Loading…</div>
    <div
      v-else-if="error"
      class="miosa-filetree__state miosa-filetree__state--error"
      role="alert"
    >
      {{ error.message }}
    </div>
    <template v-else>
      <div
        v-for="{ node, depth } in flatNodes"
        :key="node.path"
        class="miosa-filetree__node"
        :style="{ paddingLeft: `${depth * 12 + 8}px` }"
        role="treeitem"
        :aria-expanded="node.type === 'dir' ? node.expanded : undefined"
      >
        <button
          :class="['miosa-filetree__label', node.type === 'dir' && 'miosa-filetree__label--dir']"
          :aria-label="node.name"
          @click="node.type === 'dir' ? toggleDir(node) : emit('select', node.path)"
        >
          <span class="miosa-filetree__icon">
            {{ node.type === "dir" ? (node.expanded ? "▾" : "▸") : "·" }}
          </span>
          <span>{{ node.name }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
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
