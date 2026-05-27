import { mount, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaActivityFeed from "./MiosaActivityFeed.vue";

class MockES {
  onopen: (() => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  close = vi.fn();
  static instances: MockES[] = [];
  constructor() {
    MockES.instances.push(this);
  }
  fire(data: unknown) {
    this.onmessage?.(
      new MessageEvent("message", { data: JSON.stringify(data) }),
    );
  }
}

const mockStream = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    tenant: { events: { stream: mockStream } },
  })),
}));

describe("MiosaActivityFeed (Vue)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockES.instances = [];
    mockStream.mockReturnValue(new MockES());
  });

  it("renders disconnected state initially", () => {
    const wrapper = mount(MiosaActivityFeed, { props: { apiKey: "k" } });
    expect(wrapper.find('[aria-label="Disconnected"]').exists()).toBe(true);
  });

  it("shows category filter chips", () => {
    const wrapper = mount(MiosaActivityFeed, { props: { apiKey: "k" } });
    expect(wrapper.find('[aria-label="Filter by category"]').exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain("sandbox");
    expect(wrapper.text()).toContain("member");
  });

  it("renders incoming SSE events", async () => {
    const wrapper = mount(MiosaActivityFeed, { props: { apiKey: "k" } });
    const es = MockES.instances[0]!;
    es.fire({
      id: "ev1",
      ts: new Date().toISOString(),
      type: "sandbox.ready",
      actor: "system",
      resource: "sb_abc",
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("sandbox.ready");
  });

  it("toggles category chip active state", async () => {
    const wrapper = mount(MiosaActivityFeed, { props: { apiKey: "k" } });
    const chip = wrapper
      .findAll(".miosa-af__chip")
      .find((b) => b.text() === "sandbox")!;
    expect(chip.attributes("aria-pressed")).toBe("false");
    await chip.trigger("click");
    expect(chip.attributes("aria-pressed")).toBe("true");
    await chip.trigger("click");
    expect(chip.attributes("aria-pressed")).toBe("false");
  });

  it("closes EventSource on unmount", () => {
    const wrapper = mount(MiosaActivityFeed, { props: { apiKey: "k" } });
    const es = MockES.instances[0]!;
    wrapper.unmount();
    expect(es.close).toHaveBeenCalled();
  });
});
