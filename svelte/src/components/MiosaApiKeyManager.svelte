<script lang="ts">
  import { Miosa } from "@miosa/sdk";
  import { onMount } from "svelte";

  interface ApiKey { id: string; name: string; last4: string; scopes: string[]; created_at: string; last_used_at?: string; expires_at?: string; external_user_id?: string; }
  interface ApiKeySdk { apiKeys: { list: () => Promise<unknown>; create: (p: Record<string,unknown>) => Promise<unknown>; createScoped: (p: Record<string,unknown>) => Promise<unknown>; revoke: (p:{id:string}) => Promise<unknown> } }

  const ALL_SCOPES = ["sandboxes:read","sandboxes:write","computers:read","computers:write","storage:read","storage:write","databases:read","databases:write","usage:read","audit_log:read","tenant:admin"];

  interface Props {
    apiKey: string;
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
    class?: string;
    style?: string;
  }

  let { apiKey, theme = "dark", unstyled = false, onError, class: className, style }: Props = $props();

  function asApi(key: string): ApiKeySdk { return new Miosa({ apiKey: key }) as unknown as ApiKeySdk; }

  let keys = $state<ApiKey[]>([]);
  let loading = $state(true);
  let error = $state<Error | null>(null);
  let creating = $state(false);
  let revealSecret = $state<string | null>(null);
  let revokingId = $state<string | null>(null);
  let formName = $state("");
  let formScopes = $state<string[]>([]);
  let formExpiresAt = $state("");
  let formIsL2 = $state(false);
  let formExternalUserId = $state("");

  async function load() {
    loading = true; error = null;
    try {
      const raw = await asApi(apiKey).apiKeys.list();
      keys = (raw as { data?: ApiKey[] }).data ?? [];
    } catch (e) { error = e instanceof Error ? e : new Error(String(e)); onError?.(error); }
    finally { loading = false; }
  }

  function toggleScope(scope: string) {
    formScopes = formScopes.includes(scope) ? formScopes.filter((s) => s !== scope) : [...formScopes, scope];
  }

  async function handleCreate(e: Event) {
    e.preventDefault();
    if (!formName.trim() || creating) return;
    creating = true;
    try {
      const params: Record<string,unknown> = { name: formName.trim(), scopes: formScopes };
      if (formExpiresAt) params["expires_at"] = formExpiresAt;
      if (formIsL2 && formExternalUserId) params["external_user_id"] = formExternalUserId;
      const fn = formIsL2 ? "createScoped" : "create";
      const raw = await asApi(apiKey).apiKeys[fn](params);
      const result = raw as { secret?: string };
      if (result.secret) revealSecret = result.secret;
      formName = ""; formScopes = []; formExpiresAt = ""; formIsL2 = false; formExternalUserId = "";
      await load();
    } catch (e) { onError?.(e instanceof Error ? e : new Error(String(e))); }
    finally { creating = false; }
  }

  async function handleRevoke(keyId: string) {
    if (!window.confirm("Revoke this API key? This cannot be undone.")) return;
    revokingId = keyId;
    try {
      await asApi(apiKey).apiKeys.revoke({ id: keyId });
      await load();
    } catch (e) { onError?.(e instanceof Error ? e : new Error(String(e))); }
    finally { revokingId = null; }
  }

  onMount(load);
</script>

<div class={[!unstyled && "miosa-akm", !unstyled && `miosa-akm--${theme}`, className].filter(Boolean).join(" ")} {style} data-miosa-theme={theme}>
  {#if revealSecret}
    <div class="miosa-akm__modal-overlay" role="dialog" aria-modal="true" aria-label="API key created">
      <div class="miosa-akm__modal">
        <h3 class="miosa-akm__modal-title">API key created</h3>
        <p class="miosa-akm__modal-hint">Copy this secret now — it will not be shown again.</p>
        <code class="miosa-akm__secret">{revealSecret}</code>
        <button type="button" class="miosa-akm__copy-btn" aria-label="Copy secret to clipboard" onclick={() => window.navigator.clipboard.writeText(revealSecret!)}>Copy</button>
        <button type="button" class="miosa-akm__modal-close" onclick={() => revealSecret = null}>Done</button>
      </div>
    </div>
  {/if}

  <form class="miosa-akm__create" aria-label="Create API key" onsubmit={handleCreate}>
    <h3 class="miosa-akm__form-title">New API key</h3>
    <input type="text" class="miosa-akm__input" placeholder="Key name" aria-label="Key name" bind:value={formName} required />
    <label class="miosa-akm__label"><input type="checkbox" aria-label="Scoped (L2) key" bind:checked={formIsL2} /> Scoped (L2) — bound to an external user</label>
    {#if formIsL2}
      <input type="text" class="miosa-akm__input" placeholder="external_user_id" aria-label="External user ID" bind:value={formExternalUserId} />
    {/if}
    <div class="miosa-akm__scopes" role="group" aria-label="Scopes">
      {#each ALL_SCOPES as scope}
        <label class="miosa-akm__scope-label">
          <input type="checkbox" checked={formScopes.includes(scope)} aria-label={scope} onchange={() => toggleScope(scope)} /> {scope}
        </label>
      {/each}
    </div>
    <input type="datetime-local" class="miosa-akm__input" aria-label="Expiration date (optional)" title="Expiration date (optional)" bind:value={formExpiresAt} />
    <button type="submit" class="miosa-akm__create-btn" disabled={creating} aria-label="Create API key">{creating ? "Creating…" : "Create key"}</button>
  </form>

  {#if loading}
    <div class="miosa-akm__loading" aria-busy="true">Loading…</div>
  {:else if error}
    <div class="miosa-akm__error" role="alert">{error.message}</div>
  {:else}
    <ul class="miosa-akm__list" role="list" aria-label="API keys">
      {#each keys as k (k.id)}
        <li class="miosa-akm__item">
          <div class="miosa-akm__item-info">
            <span class="miosa-akm__item-name">{k.name}</span>
            <code class="miosa-akm__item-last4">…{k.last4}</code>
            {#if k.external_user_id}<span class="miosa-akm__item-badge">L2</span>{/if}
          </div>
          <div class="miosa-akm__item-scopes">{#each k.scopes as s}<span class="miosa-akm__scope-chip">{s}</span>{/each}</div>
          <div class="miosa-akm__item-meta">
            <span>Created {new Date(k.created_at).toLocaleDateString()}</span>
            {#if k.last_used_at}<span>Last used {new Date(k.last_used_at).toLocaleDateString()}</span>{/if}
            {#if k.expires_at}<span>Expires {new Date(k.expires_at).toLocaleDateString()}</span>{/if}
          </div>
          <button type="button" class="miosa-akm__revoke-btn" disabled={revokingId === k.id} aria-label={`Revoke ${k.name}`} onclick={() => handleRevoke(k.id)}>
            {revokingId === k.id ? "…" : "Revoke"}
          </button>
        </li>
      {/each}
      {#if keys.length === 0}<li class="miosa-akm__empty">No API keys yet.</li>{/if}
    </ul>
  {/if}
</div>
