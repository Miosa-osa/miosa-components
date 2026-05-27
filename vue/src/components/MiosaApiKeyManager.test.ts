import { mount, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaApiKeyManager from "./MiosaApiKeyManager.vue";

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockRevoke = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    apiKeys: {
      list: mockList,
      create: mockCreate,
      createScoped: mockCreate,
      revoke: mockRevoke,
    },
  })),
}));

const MOCK_KEYS = [
  {
    id: "k1",
    name: "CI key",
    last4: "ab12",
    scopes: ["sandboxes:read"],
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "k2",
    name: "Read-only",
    last4: "cd34",
    scopes: ["sandboxes:read"],
    created_at: "2026-02-01T00:00:00Z",
    external_user_id: "user_abc",
  },
];

describe("MiosaApiKeyManager (Vue)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ data: MOCK_KEYS });
    mockCreate.mockResolvedValue({ secret: "sk_live_secret123" });
    mockRevoke.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("shows loading initially", () => {
    mockList.mockImplementation(() => new Promise(() => undefined));
    const wrapper = mount(MiosaApiKeyManager, { props: { apiKey: "k" } });
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
  });

  it("renders key list after load", async () => {
    const wrapper = mount(MiosaApiKeyManager, { props: { apiKey: "k" } });
    await flushPromises();
    expect(wrapper.text()).toContain("CI key");
    expect(wrapper.text()).toContain("Read-only");
  });

  it("shows L2 badge for scoped keys", async () => {
    const wrapper = mount(MiosaApiKeyManager, { props: { apiKey: "k" } });
    await flushPromises();
    expect(wrapper.find(".miosa-akm__item-badge").exists()).toBe(true);
  });

  it("creates key and shows reveal modal", async () => {
    const wrapper = mount(MiosaApiKeyManager, { props: { apiKey: "k" } });
    await flushPromises();
    await wrapper.find('[aria-label="Key name"]').setValue("My new key");
    await wrapper.find('[aria-label="Create API key"]').trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain("sk_live_secret123");
  });

  it("revokes key with confirmation", async () => {
    const wrapper = mount(MiosaApiKeyManager, { props: { apiKey: "k" } });
    await flushPromises();
    await wrapper.find('[aria-label="Revoke CI key"]').trigger("click");
    await flushPromises();
    expect(mockRevoke).toHaveBeenCalledWith({ id: "k1" });
  });
});
