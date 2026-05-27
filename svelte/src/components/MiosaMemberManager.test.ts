import { render, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaMemberManager from "./MiosaMemberManager.svelte";

const mockListMembers = vi.fn();
const mockInviteMember = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    tenant: {
      listMembers: mockListMembers,
      inviteMember: mockInviteMember,
      removeMember: vi.fn().mockResolvedValue({}),
      changeMemberRole: vi.fn().mockResolvedValue({}),
    },
    workspaces: {
      listMembers: mockListMembers,
      inviteMember: mockInviteMember,
      removeMember: vi.fn().mockResolvedValue({}),
      changeMemberRole: vi.fn().mockResolvedValue({}),
    },
  })),
}));

const MEMBERS = [
  { id: "m1", email: "alice@example.com", role: "admin", status: "active" },
  { id: "m2", email: "bob@example.com", role: "developer", status: "pending" },
];

describe("MiosaMemberManager (Svelte)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListMembers.mockResolvedValue({ data: MEMBERS });
    mockInviteMember.mockResolvedValue({});
  });

  it("shows loading state initially", () => {
    mockListMembers.mockImplementation(() => new Promise(() => undefined));
    const { container } = render(MiosaMemberManager, {
      props: { scope: "tenant", apiKey: "k" },
    });
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("renders members after load", async () => {
    const { findByText } = render(MiosaMemberManager, {
      props: { scope: "tenant", apiKey: "k" },
    });
    expect(await findByText("alice@example.com")).toBeTruthy();
    expect(await findByText("bob@example.com")).toBeTruthy();
  });

  it("submits invite form", async () => {
    const { findByLabelText } = render(MiosaMemberManager, {
      props: { scope: "tenant", apiKey: "k" },
    });
    const emailInput = await findByLabelText("Invite email");
    await fireEvent.input(emailInput, {
      target: { value: "carol@example.com" },
    });
    const form = emailInput.closest("form")!;
    await fireEvent.submit(form);
    await vi.waitFor(() =>
      expect(mockInviteMember).toHaveBeenCalledWith(
        expect.objectContaining({ email: "carol@example.com" }),
      ),
    );
  });

  it("filters members by search input", async () => {
    const { findByText, findByLabelText, queryByText } = render(
      MiosaMemberManager,
      { props: { scope: "tenant", apiKey: "k" } },
    );
    await findByText("alice@example.com");
    const search = await findByLabelText("Search members");
    await fireEvent.input(search, { target: { value: "alice" } });
    expect(queryByText("bob@example.com")).toBeNull();
  });

  it("calls onError on API failure", async () => {
    mockListMembers.mockRejectedValue(new Error("fail"));
    const onError = vi.fn();
    render(MiosaMemberManager, {
      props: { scope: "tenant", apiKey: "k", onError },
    });
    await vi.waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "fail" }),
      ),
    );
  });
});
