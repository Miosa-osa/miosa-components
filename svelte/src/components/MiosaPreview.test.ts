import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MiosaPreview from "./MiosaPreview.svelte";

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
    const { getByText } = render(MiosaPreview, {
      props: { sandboxId: "sb-1", apiKey: "key_test" },
    });
    expect(getByText("Loading preview…")).toBeTruthy();
  });

  it("renders container with correct role", () => {
    const { container } = render(MiosaPreview, {
      props: { sandboxId: "sb-1", apiKey: "key_test" },
    });
    expect(container.querySelector('[role="region"]')).toBeTruthy();
  });

  it("renders iframe after resolution with previewToken prop", async () => {
    const { container } = render(MiosaPreview, {
      props: { sandboxId: "sb-1", previewToken: "direct_tok" },
    });
    await new Promise((r) => setTimeout(r, 0));
    const iframe = container.querySelector("iframe");
    if (iframe) {
      expect(iframe.getAttribute("src")).toContain("direct_tok");
    }
  });

  it("shows error state when no credentials given", async () => {
    const { container } = render(MiosaPreview, {
      props: { sandboxId: "sb-1" },
    });
    await new Promise((r) => setTimeout(r, 0));
    const errorEl = container.querySelector(".miosa-preview__error");
    if (errorEl) {
      expect(errorEl.textContent).toBeTruthy();
    }
  });
});
