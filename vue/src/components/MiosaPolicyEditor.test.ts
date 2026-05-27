import { mount, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaPolicyEditor from "./MiosaPolicyEditor.vue";

const mockPolicy = vi.fn();
const mockSetPolicy = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    tenant: { policy: mockPolicy, setPolicy: mockSetPolicy },
    workspaces: {},
    externalUsers: {},
  })),
}));

const MOCK = {
  lifecycle: {
    default_idle_timeout_sec: { value: 1800, source: "tenant" },
    default_timeout_sec: { value: 86400, source: "platform" },
  },
  quotas: { max_sandboxes: { value: 5, source: "platform" } },
  sizing: {},
  templates: {},
  features: {},
  egress: {},
  branding: {},
  webhooks: {},
};

describe("MiosaPolicyEditor (Vue)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPolicy.mockResolvedValue(MOCK);
    mockSetPolicy.mockResolvedValue({});
  });

  it("renders loading skeleton initially", () => {
    mockPolicy.mockImplementation(() => new Promise(() => undefined));
    const wrapper = mount(MiosaPolicyEditor, {
      props: { scope: "tenant", apiKey: "k" },
    });
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
  });

  it("renders category sections after load", async () => {
    const wrapper = mount(MiosaPolicyEditor, {
      props: { scope: "tenant", apiKey: "k" },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("lifecycle");
    expect(wrapper.text()).toContain("quotas");
  });

  it("expands section on click and shows field key", async () => {
    const wrapper = mount(MiosaPolicyEditor, {
      props: { scope: "tenant", apiKey: "k" },
    });
    await flushPromises();
    const btn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("lifecycle"))!;
    await btn.trigger("click");
    expect(wrapper.text()).toContain("default_idle_timeout_sec");
  });

  it("calls setPolicy on save", async () => {
    const wrapper = mount(MiosaPolicyEditor, {
      props: { scope: "tenant", apiKey: "k" },
    });
    await flushPromises();
    const saveBtn = wrapper.find('[aria-label="Save policy"]');
    await saveBtn.trigger("click");
    await flushPromises();
    expect(mockSetPolicy).toHaveBeenCalled();
  });

  it("shows effective policy preview panel", async () => {
    const wrapper = mount(MiosaPolicyEditor, {
      props: { scope: "tenant", apiKey: "k" },
    });
    await flushPromises();
    expect(
      wrapper.find('[aria-label="Effective policy preview"]').exists(),
    ).toBe(true);
  });
});
