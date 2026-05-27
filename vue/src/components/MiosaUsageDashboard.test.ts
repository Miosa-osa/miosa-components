import { mount, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaUsageDashboard from "./MiosaUsageDashboard.vue";

const mockGet = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({ usage: { get: mockGet } })),
}));

const MOCK = {
  totals: { sandbox_hours: 42.5, storage_gb_hours: 12.1, credits: 9900 },
  buckets: [
    {
      label: "2026-05-01",
      sandbox_hours: 10,
      storage_gb_hours: 3,
      credits: 2000,
    },
    {
      label: "2026-05-02",
      sandbox_hours: 20,
      storage_gb_hours: 5,
      credits: 4000,
    },
  ],
  top_users: [
    { id: "u1", email: "alice@example.com", sandbox_hours: 25, credits: 5000 },
  ],
};

describe("MiosaUsageDashboard (Vue)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(MOCK);
  });

  it("shows loading initially", () => {
    mockGet.mockImplementation(() => new Promise(() => undefined));
    const wrapper = mount(MiosaUsageDashboard, {
      props: { scope: "tenant", apiKey: "k" },
    });
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
  });

  it("renders totals after load", async () => {
    const wrapper = mount(MiosaUsageDashboard, {
      props: { scope: "tenant", apiKey: "k" },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("42.5");
    expect(wrapper.text()).toContain("9,900");
  });

  it("renders SVG charts", async () => {
    const wrapper = mount(MiosaUsageDashboard, {
      props: { scope: "tenant", apiKey: "k" },
    });
    await flushPromises();
    expect(wrapper.findAll(".miosa-ud__chart-svg").length).toBe(3);
  });

  it("renders top users table", async () => {
    const wrapper = mount(MiosaUsageDashboard, {
      props: { scope: "tenant", apiKey: "k" },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("alice@example.com");
  });

  it("passes period and scope to API", async () => {
    mount(MiosaUsageDashboard, {
      props: { scope: "workspace", id: "ws1", apiKey: "k", period: "7d" },
    });
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({ period: "7d", workspace_id: "ws1" }),
    );
  });
});
