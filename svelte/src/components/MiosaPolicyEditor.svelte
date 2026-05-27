<script lang="ts">
  import { Miosa } from "@miosa/sdk";
  import { onMount } from "svelte";

  type PolicyScope = "tenant" | "workspace" | "user";
  interface PolicyField<T> { value: T; source: "user" | "workspace" | "tenant" | "platform"; }
  type EffectivePolicy = Record<string, Record<string, PolicyField<unknown>>>;
  type PolicyDraft = Record<string, Record<string, unknown>>;

  const CATEGORIES = ["lifecycle","quotas","sizing","templates","features","egress","branding","webhooks"] as const;

  interface Props {
    scope: PolicyScope;
    id?: string;
    apiKey: string;
    theme?: "light" | "dark";
    unstyled?: boolean;
    onSave?: (policy: PolicyDraft) => void;
    onError?: (err: Error) => void;
    class?: string;
    style?: string;
  }

  let { scope, id, apiKey, theme = "dark", unstyled = false, onSave, onError, class: className, style }: Props = $props();

  interface PolicySdkClient {
    tenant: { policy: () => Promise<unknown>; setPolicy: (p: unknown) => Promise<unknown> };
    workspaces: { getPolicy: (p: { id: string }) => Promise<unknown>; setPolicy: (p: { id: string; policy: unknown }) => Promise<unknown> };
    externalUsers: { effectivePolicy: (p: { external_user_id: string }) => Promise<unknown>; setPolicy: (p: { external_user_id: string; policy: unknown }) => Promise<unknown> };
  }
  function asApi(key: string): PolicySdkClient { return new Miosa({ apiKey: key }) as unknown as PolicySdkClient; }

  let effective = $state<EffectivePolicy>({});
  let overrides = $state<PolicyDraft>({});
  let loading = $state(true);
  let saving = $state(false);
  let error = $state<Error | null>(null);
  let openSections = $state<Set<string>>(new Set());

  function toggleSection(cat: string) {
    const s = new Set(openSections);
    if (s.has(cat)) s.delete(cat); else s.add(cat);
    openSections = s;
  }

  function setOverride(cat: string, key: string, value: unknown) {
    const catObj = { ...(overrides[cat] ?? {}) };
    if (value === undefined) { delete catObj[key]; } else { catObj[key] = value; }
    overrides = { ...overrides, [cat]: catObj };
  }

  function sourceLabel(source: string): string {
    if (source === "tenant") return "Inherited from tenant";
    if (source === "workspace") return "Inherited from workspace";
    if (source === "platform") return "Platform default";
    return "Set at this level";
  }

  function fmtVal(val: unknown): string {
    if (Array.isArray(val)) return val.join(", ") || "(empty)";
    if (typeof val === "boolean") return val ? "true" : "false";
    if (val == null) return "(unset)";
    return String(val);
  }

  function effectiveJson(): string {
    return JSON.stringify(
      Object.fromEntries(CATEGORIES.map((cat) => [cat, Object.fromEntries(
        Object.entries(effective[cat] ?? {}).map(([k, f]) => [
          k,
          (overrides[cat] as Record<string, unknown> | undefined)?.[k] ?? (f as PolicyField<unknown>).value,
        ])
      )])),
      null, 2
    );
  }

  async function load() {
    loading = true; error = null;
    try {
      const c = asApi(apiKey);
      let raw: unknown;
      if (scope === "tenant") raw = await c.tenant.policy();
      else if (scope === "workspace" && id) raw = await c.workspaces.getPolicy({ id });
      else if (scope === "user" && id) raw = await c.externalUsers.effectivePolicy({ external_user_id: id });
      else raw = {};
      effective = raw as EffectivePolicy;
      overrides = {};
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      onError?.(error);
    } finally { loading = false; }
  }

  async function save() {
    if (saving) return;
    saving = true;
    try {
      const c = asApi(apiKey);
      if (scope === "tenant") await c.tenant.setPolicy(overrides);
      else if (scope === "workspace" && id) await c.workspaces.setPolicy({ id, policy: overrides });
      else if (scope === "user" && id) await c.externalUsers.setPolicy({ external_user_id: id, policy: overrides });
      onSave?.(overrides);
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error(String(e)));
    } finally { saving = false; }
  }

  onMount(load);
  $effect(() => { void scope; void id; void apiKey; load(); });
</script>

<div class={[!unstyled && "miosa-pe", !unstyled && `miosa-pe--${theme}`, className].filter(Boolean).join(" ")} {style} data-miosa-theme={theme}>
  {#if loading}
    <div class="miosa-pe__skeleton" aria-busy="true" aria-label="Loading policy"></div>
  {:else if error}
    <div class="miosa-pe--error" role="alert">{error.message}</div>
  {:else}
    <div class="miosa-pe__layout">
      <div class="miosa-pe__sections">
        {#each CATEGORIES as cat}
          <div class="miosa-pe__section miosa-pe__section--{theme}">
            <button type="button" class="miosa-pe__section-toggle" aria-expanded={openSections.has(cat)} onclick={() => toggleSection(cat)}>
              <span class="miosa-pe__section-title">{cat}</span>
              <span aria-hidden="true">{openSections.has(cat) ? "▾" : "▸"}</span>
            </button>
            {#if openSections.has(cat)}
              <div class="miosa-pe__section-body">
                {#each Object.entries(effective[cat] ?? {}) as [key, field]}
                  {@const f = field as PolicyField<unknown>}
                  {@const isInherited = !(key in (overrides[cat] ?? {}))}
                  <div class="miosa-pe__section-row">
                    <div class="miosa-pe__section-meta">
                      <span class="miosa-pe__section-key">{key}</span>
                      <span class="miosa-pe__section-source">{sourceLabel(f.source)}</span>
                    </div>
                    <div class="miosa-pe__section-value">
                      {#if isInherited}
                        <span class="miosa-pe__section-inherited"><s>{fmtVal(f.value)}</s></span>
                      {:else}
                        <input class="miosa-pe__input" value={String((overrides[cat] as Record<string,unknown>|undefined)?.[key] ?? "")} aria-label={key}
                          oninput={(e) => setOverride(cat, key, (e.target as HTMLInputElement).value)} />
                      {/if}
                      <button type="button" class="miosa-pe__section-toggle-inherit"
                        aria-label={isInherited ? `Override ${key}` : `Revert ${key} to inherited`}
                        onclick={() => isInherited ? setOverride(cat, key, f.value) : setOverride(cat, key, undefined)}>
                        {isInherited ? "Override" : "Revert"}
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
      <div class="miosa-pe__preview" aria-label="Effective policy preview">
        <h3 class="miosa-pe__preview-title">Effective policy</h3>
        <pre class="miosa-pe__preview-json">{effectiveJson()}</pre>
      </div>
    </div>
    <div class="miosa-pe__actions">
      <button type="button" class="miosa-pe__save-btn" disabled={saving} aria-label="Save policy" onclick={save}>
        {saving ? "Saving…" : "Save policy"}
      </button>
    </div>
  {/if}
</div>
