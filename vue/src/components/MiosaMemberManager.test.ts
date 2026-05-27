import { mount, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaMemberManager from "./MiosaMemberManager.vue";

const mockListMembers = vi.fn();
const mockInviteMember = vi.fn();
const mockRemoveMember = vi.fn();
const mockChangeMemberRole = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    tenant: {
      listMembers: mockListMembers,
      inviteMember: mockInviteMember,
      removeMember: mockRemoveMember,
      changeMemberRole: mockChangeMemberRole,
    },
    workspaces: {
      listMembers: mockListMembers,
      inviteMember: mockInviteMember,
      removeMember: mockRemoveMember,
      changeMemberRole: mockChangeMemberRole,
    },
  })),
}));

const MOCK_MEMBERS = [
  { id: "m1", email: "alice@example.com", role: "admin", status: "active" },
  { id: "m2", email: "bob@example.com", role: "developer", status: "pending" },
];

describe("MiosaMemberManager (Vue)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListMembers.mockResolvedValue({ data: MOCK_MEMBERS });
    mockInviteMember.mockResolvedValue({});
    mockRemoveMember.mockResolvedValue({});
    mockChangeMemberRole.mockResolvedValue({});
  });

  it("shows loading state initially", () => {
    mockListMembers.mockImplementation(() => new Promise(() => undefined));
    const wrapper = mount(MiosaMemberManager, {
      props: { scope: "tenant", apiKey: "k" },
    });
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
  });

  it("renders members after load", async () => {
    const wrapper = mount(MiosaMemberManager, {
      props: { scope: "tenant", apiKey: "k" },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("alice@example.com");
    expect(wrapper.text()).toContain("bob@example.com");
  });

  it("submits invite form", async () => {
    const wrapper = mount(MiosaMemberManager, {
      props: { scope: "tenant", apiKey: "k" },
    });
    await flushPromises();
    const emailInput = wrapper.find('[aria-label="Invite email"]');
    await emailInput.setValue("carol@example.com");
    await wrapper.find('[aria-label="Invite member"]').trigger("submit");
    await flushPromises();
    expect(mockInviteMember).toHaveBeenCalledWith(
      expect.objectContaining({ email: "carol@example.com" }),
    );
  });

  it("filters members by search", async () => {
    const wrapper = mount(MiosaMemberManager, {
      props: { scope: "tenant", apiKey: "k" },
    });
    await flushPromises();
    await wrapper.find('[aria-label="Search members"]').setValue("alice");
    expect(wrapper.text()).toContain("alice@example.com");
    expect(wrapper.text()).not.toContain("bob@example.com");
  });

  it("calls onError on API failure", async () => {
    mockListMembers.mockRejectedValue(new Error("fail"));
    const onError = vi.fn();
    mount(MiosaMemberManager, {
      props: { scope: "tenant", apiKey: "k", onError },
    });
    await flushPromises();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "fail" }),
    );
  });
});
