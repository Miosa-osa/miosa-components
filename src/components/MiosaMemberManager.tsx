import React, { useCallback, useEffect, useState } from "react";
import { cn } from "../utils/cn.js";
import { getClient } from "../utils/client.js";
import type { MiosaBaseProps } from "../types.js";

export type MemberScope = "tenant" | "workspace";

type Role = "owner" | "admin" | "developer" | "billing" | "member" | "viewer";

interface Member {
  id: string;
  email: string;
  name?: string;
  role: Role;
  status: "active" | "pending";
  avatar?: string;
}

export interface MiosaMemberManagerProps extends MiosaBaseProps {
  scope: MemberScope;
  id?: string;
  apiKey: string;
  unstyled?: boolean;
  style?: React.CSSProperties;
}

// Concrete SDK shape used by this component (avoids noUncheckedIndexedAccess)
interface MemberSdkClient {
  tenant: {
    listMembers: () => Promise<unknown>;
    inviteMember: (p: { email: string; role: string }) => Promise<unknown>;
    changeMemberRole: (p: {
      member_id: string;
      role: string;
    }) => Promise<unknown>;
    removeMember: (p: { member_id: string }) => Promise<unknown>;
  };
  workspaces: {
    listMembers: (p: { id: string }) => Promise<unknown>;
    inviteMember: (p: {
      id: string;
      email: string;
      role: string;
    }) => Promise<unknown>;
    changeMemberRole: (p: {
      id: string;
      member_id: string;
      role: string;
    }) => Promise<unknown>;
    removeMember: (p: { id: string; member_id: string }) => Promise<unknown>;
  };
}

function asApi(apiKey: string): MemberSdkClient {
  return getClient(apiKey) as unknown as MemberSdkClient;
}

const ROLES: Role[] = [
  "owner",
  "admin",
  "developer",
  "billing",
  "member",
  "viewer",
];

type State =
  | { status: "loading" }
  | { status: "ready"; members: Member[] }
  | { status: "error"; error: Error };

function Avatar({
  member,
  size,
}: {
  member: Member;
  size?: number;
}): React.ReactElement {
  const s = size ?? 32;
  if (member.avatar) {
    return (
      <img
        src={member.avatar}
        alt={member.email}
        width={s}
        height={s}
        className="miosa-mm__avatar"
      />
    );
  }
  const initials = (member.name ?? member.email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className="miosa-mm__avatar miosa-mm__avatar--initials"
      style={{ width: s, height: s }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export function MiosaMemberManager({
  scope,
  id,
  apiKey,
  theme = "dark",
  onError,
  className,
  style,
  unstyled = false,
}: MiosaMemberManagerProps): React.ReactElement {
  const [state, setState] = useState<State>({ status: "loading" });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const c = asApi(apiKey);
      let raw: unknown;
      if (scope === "tenant") {
        raw = await c.tenant.listMembers();
      } else if (scope === "workspace" && id) {
        raw = await c.workspaces.listMembers({ id });
      } else {
        raw = { data: [] };
      }
      const data = raw as { data?: Member[] };
      setState({ status: "ready", members: data.data ?? [] });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ status: "error", error });
      onError?.(error);
    }
  }, [scope, id, apiKey, onError]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const handleInvite = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inviteEmail || inviting) return;
      setInviting(true);
      try {
        const c = asApi(apiKey);
        if (scope === "tenant") {
          await c.tenant.inviteMember({ email: inviteEmail, role: inviteRole });
        } else if (scope === "workspace" && id) {
          await c.workspaces.inviteMember({
            id,
            email: inviteEmail,
            role: inviteRole,
          });
        }
        setInviteEmail("");
        await loadMembers();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
      } finally {
        setInviting(false);
      }
    },
    [
      inviteEmail,
      inviteRole,
      inviting,
      scope,
      id,
      apiKey,
      loadMembers,
      onError,
    ],
  );

  const handleRoleChange = useCallback(
    async (memberId: string, role: Role) => {
      try {
        const c = asApi(apiKey);
        if (scope === "tenant") {
          await c.tenant.changeMemberRole({ member_id: memberId, role });
        } else if (scope === "workspace" && id) {
          await c.workspaces.changeMemberRole({
            id,
            member_id: memberId,
            role,
          });
        }
        await loadMembers();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
      }
    },
    [scope, id, apiKey, loadMembers, onError],
  );

  const handleRemove = useCallback(
    async (memberId: string) => {
      if (!window.confirm("Remove this member?")) return;
      setRemovingId(memberId);
      try {
        const c = asApi(apiKey);
        if (scope === "tenant") {
          await c.tenant.removeMember({ member_id: memberId });
        } else if (scope === "workspace" && id) {
          await c.workspaces.removeMember({ id, member_id: memberId });
        }
        await loadMembers();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
      } finally {
        setRemovingId(null);
      }
    },
    [scope, id, apiKey, loadMembers, onError],
  );

  const base = "miosa-mm";

  const filtered =
    state.status === "ready"
      ? state.members.filter(
          (m) =>
            (!search || m.email.toLowerCase().includes(search.toLowerCase())) &&
            (!roleFilter || m.role === roleFilter),
        )
      : [];

  return (
    <div
      className={cn(
        !unstyled && base,
        !unstyled && `${base}--${theme}`,
        className,
      )}
      style={style}
      data-miosa-theme={theme}
    >
      {/* Invite form */}
      <form
        className={`${base}__invite`}
        onSubmit={handleInvite}
        aria-label="Invite member"
      >
        <input
          type="email"
          className={`${base}__input`}
          placeholder="Email address"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          aria-label="Invite email"
          required
        />
        <select
          className={`${base}__select`}
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value as Role)}
          aria-label="Invite role"
        >
          {ROLES.filter((r) => r !== "owner").map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className={`${base}__invite-btn`}
          disabled={inviting}
          aria-label="Send invite"
        >
          {inviting ? "Inviting…" : "Invite"}
        </button>
      </form>

      {/* Filters */}
      <div className={`${base}__filters`}>
        <input
          type="search"
          className={`${base}__input`}
          placeholder="Search by email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search members"
        />
        <select
          className={`${base}__select`}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | "")}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Member list */}
      {state.status === "loading" && (
        <div className={`${base}__loading`} aria-busy="true">
          Loading members…
        </div>
      )}
      {state.status === "error" && (
        <div className={`${base}__error`} role="alert">
          {state.error.message}
        </div>
      )}
      {state.status === "ready" && (
        <ul className={`${base}__list`} role="list" aria-label="Members">
          {filtered.map((member) => (
            <li key={member.id} className={`${base}__item`}>
              <Avatar member={member} />
              <div className={`${base}__info`}>
                <span className={`${base}__email`}>{member.email}</span>
                {member.name && (
                  <span className={`${base}__name`}>{member.name}</span>
                )}
                <span
                  className={cn(
                    `${base}__status`,
                    member.status === "pending" && `${base}__status--pending`,
                  )}
                >
                  {member.status}
                </span>
              </div>
              <select
                className={`${base}__select ${base}__role-select`}
                value={member.role}
                onChange={(e) =>
                  void handleRoleChange(member.id, e.target.value as Role)
                }
                aria-label={`Role for ${member.email}`}
                disabled={member.role === "owner"}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`${base}__remove-btn`}
                onClick={() => void handleRemove(member.id)}
                disabled={removingId === member.id || member.role === "owner"}
                aria-label={`Remove ${member.email}`}
              >
                {removingId === member.id ? "…" : "Remove"}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className={`${base}__empty`}>No members found.</li>
          )}
        </ul>
      )}
    </div>
  );
}
