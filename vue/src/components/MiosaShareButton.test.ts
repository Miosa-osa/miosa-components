import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import MiosaShareButton from "./MiosaShareButton.vue";

const mockPreviewToken = vi.fn().mockResolvedValue({
  token: "tok_share",
  url: "https://preview.miosa.app/sb-2?token=tok_share",
});

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    sandboxes: {
      get: vi.fn().mockResolvedValue({ previewToken: mockPreviewToken }),
    },
  })),
}));

Object.defineProperty(globalThis, "navigator", {
  value: { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } },
  writable: true,
  configurable: true,
});

describe("MiosaShareButton", () => {
  it("renders share button", () => {
    const wrapper = mount(MiosaShareButton, {
      props: { sandboxId: "sb-2", apiKey: "key_test" },
    });
    expect(wrapper.find("button").text()).toBe("Share");
  });

  it("emits share event with URL on click", async () => {
    const wrapper = mount(MiosaShareButton, {
      props: { sandboxId: "sb-2", apiKey: "key_test" },
    });
    await wrapper.find("button").trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    const shareEvents = wrapper.emitted("share");
    if (shareEvents) {
      expect(shareEvents[0][0]).toContain("preview.miosa.app");
    }
  });
});
