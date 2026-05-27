import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MiosaFileTree from "./MiosaFileTree.svelte";

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
  it("renders tree container with correct role", () => {
    const { container } = render(MiosaFileTree, {
      props: { sandboxId: "sb-3", apiKey: "key_test" },
    });
    expect(container.querySelector('[role="tree"]')).toBeTruthy();
  });

  it("shows loading state initially", () => {
    const { getByText } = render(MiosaFileTree, {
      props: { sandboxId: "sb-3", apiKey: "key_test" },
    });
    expect(getByText("Loading…")).toBeTruthy();
  });
});
