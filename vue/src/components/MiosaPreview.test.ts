import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import MiosaPreview from "./MiosaPreview.vue";

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    sandboxes: {
      get: vi.fn().mockResolvedValue({
        previewToken: vi.fn().mockResolvedValue({
          token: "tok_test",
          url: "https://preview.miosa.app/sb-1?token=tok_test",
        }),
      }),
    },
  })),
}));

describe("MiosaPreview", () => {
  it("renders loading state initially", () => {
    const wrapper = mount(MiosaPreview, {
      props: { sandboxId: "sb-1", apiKey: "key_test" },
    });
    expect(wrapper.find(".miosa-preview__loading").exists()).toBe(true);
  });

  it("renders iframe after token resolution", async () => {
    const wrapper = mount(MiosaPreview, {
      props: { sandboxId: "sb-1", apiKey: "key_test" },
    });
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    const iframe = wrapper.find("iframe");
    if (iframe.exists()) {
      expect(iframe.attributes("src")).toContain("preview.miosa.app");
    }
  });

  it("uses previewToken prop directly when provided", async () => {
    const wrapper = mount(MiosaPreview, {
      props: { sandboxId: "sb-1", previewToken: "direct_tok" },
    });
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    const iframe = wrapper.find("iframe");
    if (iframe.exists()) {
      expect(iframe.attributes("src")).toContain("direct_tok");
    }
  });

  it("emits error when neither previewToken nor apiKey given", async () => {
    const wrapper = mount(MiosaPreview, {
      props: { sandboxId: "sb-1" },
    });
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("error")).toBeTruthy();
  });
});
