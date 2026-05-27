import { mount, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaAuditLog from "./MiosaAuditLog.vue";

const mockList = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    audit_log: { list: mockList },
  })),
}));

const MOCK_EVENTS = [
  {
    id: "ev1",
    ts: "2026-05-01T12:00:00Z",
    type: "sandbox.created",
    actor: "alice@example.com",
    resource: "sb_abc",
    data: { sandbox_id: "sb_abc" },
  },
  {
    id: "ev2",
    ts: "2026-05-01T13:00:00Z",
    type: "member.invited",
    actor: "admin@example.com",
    resource: "t_1",
    data: { email: "new@example.com" },
  },
];

describe("MiosaAuditLog (Vue)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ events: MOCK_EVENTS });
  });

  it("shows loading initially", () => {
    mockList.mockImplementation(() => new Promise(() => undefined));
    const wrapper = mount(MiosaAuditLog, { props: { apiKey: "k" } });
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
  });

  it("renders events after load", async () => {
    const wrapper = mount(MiosaAuditLog, { props: { apiKey: "k" } });
    await flushPromises();
    expect(wrapper.text()).toContain("sandbox.created");
    expect(wrapper.text()).toContain("member.invited");
  });

  it("expands event JSON on click", async () => {
    const wrapper = mount(MiosaAuditLog, { props: { apiKey: "k" } });
    await flushPromises();
    await wrapper.find('[aria-label="Event sandbox.created"]').trigger("click");
    expect(wrapper.find(".miosa-al__item-json").text()).toContain("sb_abc");
  });

  it("renders Export CSV button", async () => {
    const wrapper = mount(MiosaAuditLog, { props: { apiKey: "k" } });
    await flushPromises();
    expect(wrapper.find('[aria-label="Export CSV"]').exists()).toBe(true);
  });

  it("passes filters to API", async () => {
    mount(MiosaAuditLog, {
      props: { apiKey: "k", filters: { action: "sandbox.created" } },
    });
    await flushPromises();
    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ action: "sandbox.created" }),
    );
  });
});
