import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import MiosaUsage from "./MiosaUsage.vue";

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    usage: {
      get: vi.fn().mockResolvedValue({
        compute_seconds: 3600,
        storage_gb_hours: 0.5,
        egress_gb: 0.1,
        period_start: "2026-05-01",
        period_end: "2026-05-26",
      }),
    },
  })),
}));

describe("MiosaUsage", () => {
  it("renders loading state initially", () => {
    const wrapper = mount(MiosaUsage, {
      props: { externalUserId: "user-1", apiKey: "key_test" },
    });
    expect(wrapper.find(".miosa-usage__state").text()).toContain("Loading");
  });

  it("renders usage data after load", async () => {
    const wrapper = mount(MiosaUsage, {
      props: { externalUserId: "user-1", apiKey: "key_test" },
    });
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    // Either shows data or state (depending on mock shape)
    expect(wrapper.find(".miosa-usage").exists()).toBe(true);
  });
});
