<script lang="ts">
  import { Miosa } from "@miosa/sdk";
  import { onMount } from "svelte";

  interface BrandingData { product_name?: string; logo_url?: string; support_url?: string; primary_color?: string; background_color?: string; }
  interface BrandingSdk { tenant: { getBranding: () => Promise<unknown>; setBranding: (p: BrandingData) => Promise<unknown> } }

  interface Props {
    apiKey: string;
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
    onSave?: (branding: BrandingData) => void;
    class?: string;
    style?: string;
  }

  let { apiKey, theme = "dark", unstyled = false, onError, onSave, class: className, style }: Props = $props();

  function asApi(key: string): BrandingSdk { return new Miosa({ apiKey: key }) as unknown as BrandingSdk; }

  let draft = $state<BrandingData>({});
  let loading = $state(true);
  let saving = $state(false);
  let error = $state<Error | null>(null);

  const FIELDS: [keyof BrandingData, string, string][] = [
    ["product_name","Product name","text"],
    ["logo_url","Logo URL","url"],
    ["support_url","Support URL","url"],
    ["primary_color","Primary color","color"],
    ["background_color","Background color","color"],
  ];

  async function load() {
    loading = true; error = null;
    try {
      const raw = await asApi(apiKey).tenant.getBranding();
      draft = ((raw as { data?: BrandingData }).data ?? raw) as BrandingData;
    } catch (e) { error = e instanceof Error ? e : new Error(String(e)); onError?.(error); }
    finally { loading = false; }
  }

  async function save(e: Event) {
    e.preventDefault();
    if (saving) return;
    saving = true;
    try {
      await asApi(apiKey).tenant.setBranding(draft);
      onSave?.(draft);
    } catch (e) { onError?.(e instanceof Error ? e : new Error(String(e))); }
    finally { saving = false; }
  }

  onMount(load);
  $effect(() => { void apiKey; load(); });
</script>

<div class={[!unstyled && "miosa-be", !unstyled && `miosa-be--${theme}`, className].filter(Boolean).join(" ")} {style} data-miosa-theme={theme}>
  {#if loading}
    <div class="miosa-be__skeleton" aria-busy="true" aria-label="Loading branding"></div>
  {:else if error}
    <div role="alert">{error.message}</div>
  {:else}
    <div class="miosa-be__layout">
      <form class="miosa-be__form" aria-label="Branding settings" onsubmit={save}>
        {#each FIELDS as [key, label, inputType]}
          <div class="miosa-be__field">
            <label for="miosa-be-{key}" class="miosa-be__label">{label}</label>
            <input id="miosa-be-{key}" type={inputType} class="miosa-be__input" value={draft[key] ?? ""} aria-label={label}
              oninput={(e) => { draft = { ...draft, [key]: (e.target as HTMLInputElement).value || undefined }; }} />
          </div>
        {/each}
        <button type="submit" class="miosa-be__save-btn" disabled={saving} aria-label="Save branding">{saving ? "Saving…" : "Save branding"}</button>
      </form>
      <div class="miosa-be__preview" aria-label="Branding preview">
        <h3 class="miosa-be__preview-title">Preview</h3>
        <div role="img" aria-label="Error page preview" style="background:{draft.background_color ?? '#0d0d0d'};padding:24px;border-radius:8px;font-family:system-ui,sans-serif;color:{draft.primary_color ?? '#f0f0f0'};min-height:120px">
          {#if draft.logo_url}<img src={draft.logo_url} alt="Logo" style="max-height:40px;margin-bottom:12px" />{/if}
          <div style="font-size:18px;font-weight:600;margin-bottom:8px">{draft.product_name ?? "Your Product"}</div>
          <div style="font-size:13px;opacity:0.7">Something went wrong. Contact
            {#if draft.support_url}<a href={draft.support_url} style="color:{draft.primary_color}">support</a>{:else}support{/if}.
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
