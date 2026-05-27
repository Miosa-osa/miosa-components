import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MiosaShareButton from "./MiosaShareButton.svelte";

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    sandboxes: {
      get: vi.fn().mockResolvedValue({
        previewToken: vi.fn().mockResolvedValue({
          token: "tok_share",
          url: "https://preview.miosa.app/sb-2?token=tok_share",
        }),
      }),
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
    const { getByRole } = render(MiosaShareButton, {
      props: { sandboxId: "sb-2", apiKey: "key_test" },
    });
    const btn = getByRole("button", { name: /share/i });
    expect(btn).toBeTruthy();
    expect(btn.textContent?.trim()).toBe("Share");
  });

  it("button is not disabled initially", () => {
    const { getByRole } = render(MiosaShareButton, {
      props: { sandboxId: "sb-2", apiKey: "key_test" },
    });
    const btn = getByRole("button", { name: /share/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });
});
