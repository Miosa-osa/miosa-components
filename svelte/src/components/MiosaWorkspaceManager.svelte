<script lang="ts">
  import { Miosa } from "@miosa/sdk";
  import { onMount } from "svelte";
  import MiosaPolicyEditor from "./MiosaPolicyEditor.svelte";
  import MiosaMemberManager from "./MiosaMemberManager.svelte";

  interface Workspace { id: string; name: string; slug: string; archived: boolean; created_at: string; }
  interface WsApi { list: () => Promise<unknown>; create: (p: { name: string }) => Promise<unknown>; archive: (p: { id: string }) => Promise<unknown>; }
  interface C { workspaces: WsApi }

  interface Props {
    apiKey: string;
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
    class?: string;
    style?: string;
  }

  let { apiKey, theme = "dark", unstyled = false, onError, class: className, style }: Props = $props();

  function asApi(key: string): C { return new Miosa({ apiKey: key }) as unknown as C; }

  let workspaces = $state<Workspace[]>([]);
  let loading = $state(true);
  let error = $state<Error | null>(null);
  let newName = $state("");
  let creating = $state(false);
  let archivingId = $state<string | null>(null);
  let selectedId = $state<string | null>(null);
  let activeTab = $state<"policy" | "members">("policy");

  async function load() {
    loading = true; error = null;
    try {
      const raw = await asApi(apiKey).workspaces.list();
      workspaces = (raw as { data?: Workspace[] }).data ?? [];
    } catch (e) { error = e instanceof Error ? e : new Error(String(e)); onError?.(error); }
    finally { loading = false; }
  }

  async function handleCreate(e: Event) {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    creating = true;
    try {
      await asApi(apiKey).workspaces.create({ name: newName.trim() });
      newName = "";
      await load();
    } catch (e) { onError?.(e instanceof Error ? e : new Error(String(e))); }
    finally { creating = false; }
  }

  async function handleArchive(ws: Workspace) {
    if (!window.confirm(`Archive "${ws.name}"? Resources inside will be paused.`)) return;
    archivingId = ws.id;
    try {
      await asApi(apiKey).workspaces.archive({ id: ws.id });
      await load();
    } catch (e) { onError?.(e instanceof Error ? e : new Error(String(e))); }
    finally { archivingId = null; }
  }

  onMount(load);
  $effect(() => { void apiKey; load(); });
</script>

<div class={[!unstyled && "miosa-wm", !unstyled && `miosa-wm--${theme}`, className].filter(Boolean).join(" ")} {style} data-miosa-theme={theme}>
  <form class="miosa-wm__create" aria-label="Create workspace" onsubmit={handleCreate}>
    <input type="text" class="miosa-wm__input" placeholder="New workspace name" aria-label="Workspace name" bind:value={newName} required />
    <button type="submit" class="miosa-wm__create-btn" disabled={creating} aria-label="Create workspace">{creating ? "Creating…" : "Create"}</button>
  </form>

  {#if loading}
    <div class="miosa-wm__loading" aria-busy="true">Loading…</div>
  {:else if error}
    <div class="miosa-wm__error" role="alert">{error.message}</div>
  {:else}
    <ul class="miosa-wm__list" role="list" aria-label="Workspaces">
      {#each workspaces as ws (ws.id)}
        <li class={["miosa-wm__item", ws.archived && "miosa-wm__item--archived"].filter(Boolean).join(" ")}>
          <button type="button" class="miosa-wm__item-name" aria-expanded={selectedId === ws.id} aria-label={`Manage workspace ${ws.name}`}
            onclick={() => selectedId = selectedId === ws.id ? null : ws.id}>
            {ws.name}
            {#if ws.archived}<span class="miosa-wm__badge">archived</span>{/if}
          </button>
          {#if !ws.archived}
            <button type="button" class="miosa-wm__archive-btn" disabled={archivingId === ws.id} aria-label={`Archive ${ws.name}`} onclick={() => handleArchive(ws)}>
              {archivingId === ws.id ? "…" : "Archive"}
            </button>
          {/if}
          {#if selectedId === ws.id}
            <div class="miosa-wm__detail">
              <div class="miosa-wm__tabs" role="tablist">
                {#each (["policy","members"] as const) as tab}
                  <button role="tab" type="button" aria-selected={activeTab === tab}
                    class={["miosa-wm__tab", activeTab === tab && "miosa-wm__tab--active"].filter(Boolean).join(" ")}
                    onclick={() => activeTab = tab}>
                    {tab === "policy" ? "Policy" : "Members"}
                  </button>
                {/each}
              </div>
              {#if activeTab === "policy"}
                <MiosaPolicyEditor scope="workspace" id={ws.id} {apiKey} {theme} {onError} />
              {:else}
                <MiosaMemberManager scope="workspace" id={ws.id} {apiKey} {theme} {onError} />
              {/if}
            </div>
          {/if}
        </li>
      {/each}
      {#if workspaces.length === 0}<li class="miosa-wm__empty">No workspaces yet.</li>{/if}
    </ul>
  {/if}
</div>
