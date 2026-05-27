<script setup lang="ts">
import { Miosa } from "@miosa/sdk";
import { onMounted, ref, watch, computed } from "vue";

type Role = "owner" | "admin" | "developer" | "billing" | "member" | "viewer";

interface Member {
  id: string;
  email: string;
  name?: string;
  role: Role;
  status: "active" | "pending";
  avatar?: string;
}

const props = withDefaults(
  defineProps<{
    scope: "tenant" | "workspace";
    id?: string;
    apiKey: string;
    theme?: "light" | "dark";
    unstyled?: boolean;
    onError?: (err: Error) => void;
  }>(),
  { theme: "dark", unstyled: false },
);

const ROLES: Role[] = ["owner", "admin", "developer", "billing", "member", "viewer"];

interface MemberSdkClient {
  tenant: {
    listMembers: () => Promise<unknown>;
    inviteMember: (p: { email: string; role: string }) => Promise<unknown>;
    changeMemberRole: (p: { member_id: string; role: string }) => Promise<unknown>;
    removeMember: (p: { member_id: string }) => Promise<unknown>;
  };
  workspaces: {
    listMembers: (p: { id: string }) => Promise<unknown>;
    inviteMember: (p: { id: string; email: string; role: string }) => Promise<unknown>;
    changeMemberRole: (p: { id: string; member_id: string; role: string }) => Promise<unknown>;
    removeMember: (p: { id: string; member_id: string }) => Promise<unknown>;
  };
}

function asApi(apiKey: string): MemberSdkClient {
  return new Miosa({ apiKey }) as unknown as MemberSdkClient;
}

const members = ref<Member[]>([]);
const loading = ref(true);
const error = ref<Error | null>(null);
const search = ref("");
const roleFilter = ref<Role | "">("");
const inviteEmail = ref("");
const inviteRole = ref<Role>("member");
const inviting = ref(false);
const removingId = ref<string | null>(null);

const filtered = computed(() =>
  members.value.filter(
    (m) =>
      (!search.value || m.email.toLowerCase().includes(search.value.toLowerCase())) &&
      (!roleFilter.value || m.role === roleFilter.value),
  ),
);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const c = asApi(props.apiKey);
    let raw: unknown;
    if (props.scope === "tenant") {
      raw = await c.tenant.listMembers();
    } else if (props.scope === "workspace" && props.id) {
      raw = await c.workspaces.listMembers({ id: props.id });
    } else {
      raw = { data: [] };
    }
    members.value = (raw as { data?: Member[] }).data ?? [];
  } catch (e) {
    error.value = e instanceof Error ? e : new Error(String(e));
    props.onError?.(error.value);
  } finally {
    loading.value = false;
  }
}

async function handleInvite(e: Event) {
  e.preventDefault();
  if (!inviteEmail.value || inviting.value) return;
  inviting.value = true;
  try {
    const c = asApi(props.apiKey);
    if (props.scope === "tenant") {
      await c.tenant.inviteMember({ email: inviteEmail.value, role: inviteRole.value });
    } else if (props.scope === "workspace" && props.id) {
      await c.workspaces.inviteMember({ id: props.id, email: inviteEmail.value, role: inviteRole.value });
    }
    inviteEmail.value = "";
    await load();
  } catch (e) {
    props.onError?.(e instanceof Error ? e : new Error(String(e)));
  } finally {
    inviting.value = false;
  }
}

async function handleRoleChange(memberId: string, role: Role) {
  try {
    const c = asApi(props.apiKey);
    if (props.scope === "tenant") {
      await c.tenant.changeMemberRole({ member_id: memberId, role });
    } else if (props.scope === "workspace" && props.id) {
      await c.workspaces.changeMemberRole({ id: props.id, member_id: memberId, role });
    }
    await load();
  } catch (e) {
    props.onError?.(e instanceof Error ? e : new Error(String(e)));
  }
}

async function handleRemove(memberId: string) {
  if (!window.confirm("Remove this member?")) return;
  removingId.value = memberId;
  try {
    const c = asApi(props.apiKey);
    if (props.scope === "tenant") {
      await c.tenant.removeMember({ member_id: memberId });
    } else if (props.scope === "workspace" && props.id) {
      await c.workspaces.removeMember({ id: props.id, member_id: memberId });
    }
    await load();
  } catch (e) {
    props.onError?.(e instanceof Error ? e : new Error(String(e)));
  } finally {
    removingId.value = null;
  }
}

function initials(m: Member): string {
  return (m.name ?? m.email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

onMounted(load);
watch(() => [props.scope, props.id, props.apiKey], load);
</script>

<template>
  <div
    :class="[!unstyled && 'miosa-mm', !unstyled && `miosa-mm--${theme}`]"
    :data-miosa-theme="theme"
  >
    <!-- Invite form -->
    <form class="miosa-mm__invite" aria-label="Invite member" @submit="handleInvite">
      <input
        v-model="inviteEmail"
        type="email"
        class="miosa-mm__input"
        placeholder="Email address"
        aria-label="Invite email"
        required
      />
      <select v-model="inviteRole" class="miosa-mm__select" aria-label="Invite role">
        <option v-for="r in ROLES.filter((r) => r !== 'owner')" :key="r" :value="r">{{ r }}</option>
      </select>
      <button type="submit" class="miosa-mm__invite-btn" :disabled="inviting" aria-label="Send invite">
        {{ inviting ? "Inviting…" : "Invite" }}
      </button>
    </form>

    <!-- Filters -->
    <div class="miosa-mm__filters">
      <input
        v-model="search"
        type="search"
        class="miosa-mm__input"
        placeholder="Search by email"
        aria-label="Search members"
      />
      <select v-model="roleFilter" class="miosa-mm__select" aria-label="Filter by role">
        <option value="">All roles</option>
        <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
      </select>
    </div>

    <div v-if="loading" class="miosa-mm__loading" aria-busy="true">Loading members…</div>
    <div v-else-if="error" class="miosa-mm__error" role="alert">{{ error.message }}</div>
    <ul v-else class="miosa-mm__list" role="list" aria-label="Members">
      <li v-for="m in filtered" :key="m.id" class="miosa-mm__item">
        <img v-if="m.avatar" :src="m.avatar" :alt="m.email" class="miosa-mm__avatar" width="32" height="32" />
        <div v-else class="miosa-mm__avatar miosa-mm__avatar--initials" style="width:32px;height:32px" aria-hidden="true">
          {{ initials(m) }}
        </div>
        <div class="miosa-mm__info">
          <span class="miosa-mm__email">{{ m.email }}</span>
          <span v-if="m.name" class="miosa-mm__name">{{ m.name }}</span>
          <span :class="['miosa-mm__status', m.status === 'pending' && 'miosa-mm__status--pending']">{{ m.status }}</span>
        </div>
        <select
          class="miosa-mm__select miosa-mm__role-select"
          :value="m.role"
          :disabled="m.role === 'owner'"
          :aria-label="`Role for ${m.email}`"
          @change="(e) => handleRoleChange(m.id, (e.target as HTMLSelectElement).value as Role)"
        >
          <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
        </select>
        <button
          type="button"
          class="miosa-mm__remove-btn"
          :disabled="removingId === m.id || m.role === 'owner'"
          :aria-label="`Remove ${m.email}`"
          @click="handleRemove(m.id)"
        >
          {{ removingId === m.id ? "…" : "Remove" }}
        </button>
      </li>
      <li v-if="filtered.length === 0" class="miosa-mm__empty">No members found.</li>
    </ul>
  </div>
</template>
