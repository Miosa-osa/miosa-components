import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import MiosaFileTree from "./MiosaFileTree.vue";

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    sandboxes: {
      get: vi.fn().mockResolvedValue({
        files: {
          list: vi.fn().mockResolvedValue({
            entries: [
              { path: "/workspace/index.ts", type: "file" },
              { path: "/workspace/src/app.ts", type: "file" },
            ],
          }),
        },
      }),
    },
  })),
}));

describe("MiosaFileTree", () => {
  it("renders tree container", () => {
    const wrapper = mount(MiosaFileTree, {
      props: { sandboxId: "sb-3", apiKey: "key_test" },
    });
    expect(wrapper.find(".miosa-filetree").exists()).toBe(true);
  });

  it("shows loading state initially", () => {
    const wrapper = mount(MiosaFileTree, {
      props: { sandboxId: "sb-3", apiKey: "key_test" },
    });
    expect(wrapper.find(".miosa-filetree__state").text()).toContain("Loading");
  });
});
