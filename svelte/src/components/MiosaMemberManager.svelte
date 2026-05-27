<script lang="ts">
  import { Miosa } from "@miosa/sdk";
  import { onMount } from "svelte";

  type Role = "owner" | "admin" | "developer" | "billing" | "member" | "viewer";
  interface Member { id: string; email: string; name?: string; role: Role; status: "active" | "pending"; avatar?: string; }

  interface Props {
    scope: "tenant" | "workspace";
    id?: string;
    apiKey: string;
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
    class?: string;
    style?: string;
  }

  let { scope, id, apiKey, theme = "dark", unstyled = false, onError, class: className, style }: Props = $props();

  const ROLES: Role[] = ["owner","admin","developer","billing","member","viewer"];

  interface MemberSdk {
    tenant: { listMembers: () => Promise<unknown>; inviteMember: (p: { email: string; role: string }) => Promise<unknown>; changeMemberRole: (p: { member_id: string; role: string }) => Promise<unknown>; removeMember: (p: { member_id: string }) => Promise<unknown> };
    workspaces: { listMembers: (p: { id: string }) => Promise<unknown>; inviteMember: (p: { id: string; email: string; role: string }) => Promise<unknown>; changeMemberRole: (p: { id: string; member_id: string; role: string }) => Promise<unknown>; removeMember: (p: { id: string; member_id: string }) => Promise<unknown> };
  }
  function asApi(key: string): MemberSdk { return new Miosa({ apiKey: key }) as unknown as MemberSdk; }

  let members = $state<Member[]>([]);
  let loading = $state(true);
  let error = $state<Error | null>(null);
  let search = $state("");
  let roleFilter = $state<Role | "">("");
  let inviteEmail = $state("");
  let inviteRole = $state<Role>("member");
  let inviting = $state(false);
  let removingId = $state<string | null>(null);

  const filtered = $derived(members.filter(
    (m) => (!search || m.email.toLowerCase().includes(search.toLowerCase())) && (!roleFilter || m.role === roleFilter)
  ));

  async function load() {
    loading = true; error = null;
    try {
      const c = asApi(apiKey);
      let raw: unknown;
      if (scope === "tenant") raw = await c.tenant.listMembers();
      else if (scope === "workspace" && id) raw = await c.workspaces.listMembers({ id });
      else raw = { data: [] };
      members = (raw as { data?: Member[] }).data ?? [];
    } catch (e) { error = e instanceof Error ? e : new Error(String(e)); onError?.(error); }
    finally { loading = false; }
  }

  async function handleInvite(e: Event) {
    e.preventDefault();
    if (!inviteEmail || inviting) return;
    inviting = true;
    try {
      const c = asApi(apiKey);
      if (scope === "tenant") await c.tenant.inviteMember({ email: inviteEmail, role: inviteRole });
      else if (scope === "workspace" && id) await c.workspaces.inviteMember({ id, email: inviteEmail, role: inviteRole });
      inviteEmail = "";
      await load();
    } catch (e) { onError?.(e instanceof Error ? e : new Error(String(e))); }
    finally { inviting = false; }
  }

  async function handleRoleChange(memberId: string, role: Role) {
    try {
      const c = asApi(apiKey);
      if (scope === "tenant") await c.tenant.changeMemberRole({ member_id: memberId, role });
      else if (scope === "workspace" && id) await c.workspaces.changeMemberRole({ id, member_id: memberId, role });
      await load();
    } catch (e) { onError?.(e instanceof Error ? e : new Error(String(e))); }
  }

  async function handleRemove(memberId: string) {
    if (!window.confirm("Remove this member?")) return;
    removingId = memberId;
    try {
      const c = asApi(apiKey);
      if (scope === "tenant") await c.tenant.removeMember({ member_id: memberId });
      else if (scope === "workspace" && id) await c.workspaces.removeMember({ id, member_id: memberId });
      await load();
    } catch (e) { onError?.(e instanceof Error ? e : new Error(String(e))); }
    finally { removingId = null; }
  }

  function initials(m: Member): string {
    return (m.name ?? m.email).split(/[\s@]/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  }

  onMount(load);
  $effect(() => { void scope; void id; void apiKey; load(); });
</script>

<div class={[!unstyled && "miosa-mm", !unstyled && `miosa-mm--${theme}`, className].filter(Boolean).join(" ")} {style} data-miosa-theme={theme}>
  <form class="miosa-mm__invite" aria-label="Invite member" onsubmit={handleInvite}>
    <input type="email" class="miosa-mm__input" placeholder="Email address" aria-label="Invite email" bind:value={inviteEmail} required />
    <select class="miosa-mm__select" aria-label="Invite role" bind:value={inviteRole}>
      {#each ROLES.filter((r) => r !== "owner") as r}<option value={r}>{r}</option>{/each}
    </select>
    <button type="submit" class="miosa-mm__invite-btn" disabled={inviting} aria-label="Send invite">{inviting ? "Inviting…" : "Invite"}</button>
  </form>

  <div class="miosa-mm__filters">
    <input type="search" class="miosa-mm__input" placeholder="Search by email" aria-label="Search members" bind:value={search} />
    <select class="miosa-mm__select" aria-label="Filter by role" bind:value={roleFilter}>
      <option value="">All roles</option>
      {#each ROLES as r}<option value={r}>{r}</option>{/each}
    </select>
  </div>

  {#if loading}
    <div class="miosa-mm__loading" aria-busy="true">Loading members…</div>
  {:else if error}
    <div class="miosa-mm__error" role="alert">{error.message}</div>
  {:else}
    <ul class="miosa-mm__list" role="list" aria-label="Members">
      {#each filtered as m (m.id)}
        <li class="miosa-mm__item">
          {#if m.avatar}
            <img src={m.avatar} alt={m.email} class="miosa-mm__avatar" width="32" height="32" />
          {:else}
            <div class="miosa-mm__avatar miosa-mm__avatar--initials" style="width:32px;height:32px" aria-hidden="true">{initials(m)}</div>
          {/if}
          <div class="miosa-mm__info">
            <span class="miosa-mm__email">{m.email}</span>
            {#if m.name}<span class="miosa-mm__name">{m.name}</span>{/if}
            <span class={["miosa-mm__status", m.status === "pending" && "miosa-mm__status--pending"].filter(Boolean).join(" ")}>{m.status}</span>
          </div>
          <select class="miosa-mm__select miosa-mm__role-select" value={m.role} disabled={m.role === "owner"} aria-label={`Role for ${m.email}`}
            onchange={(e) => handleRoleChange(m.id, (e.target as HTMLSelectElement).value as Role)}>
            {#each ROLES as r}<option value={r}>{r}</option>{/each}
          </select>
          <button type="button" class="miosa-mm__remove-btn" disabled={removingId === m.id || m.role === "owner"} aria-label={`Remove ${m.email}`} onclick={() => handleRemove(m.id)}>
            {removingId === m.id ? "…" : "Remove"}
          </button>
        </li>
      {/each}
      {#if filtered.length === 0}<li class="miosa-mm__empty">No members found.</li>{/if}
    </ul>
  {/if}
</div>
