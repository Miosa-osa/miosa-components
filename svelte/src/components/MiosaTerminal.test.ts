import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MiosaTerminal from "./MiosaTerminal.svelte";

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    sandboxes: {
      get: vi.fn().mockResolvedValue({
        previewToken: vi
          .fn()
          .mockResolvedValue({ token: "tok", url: "wss://x" }),
      }),
    },
  })),
}));

vi.mock("xterm", () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    loadAddon: vi.fn(),
    open: vi.fn(),
    onData: vi.fn(),
    onResize: vi.fn(),
    dispose: vi.fn(),
  })),
}));

vi.mock("xterm-addon-fit", () => ({
  FitAddon: vi.fn().mockImplementation(() => ({ fit: vi.fn() })),
}));

// Prevent jsdom WS errors from async terminal init
Object.defineProperty(globalThis, "WebSocket", {
  value: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    set onmessage(_: unknown) {},
    set onerror(_: unknown) {},
  })),
  writable: true,
  configurable: true,
});

describe("MiosaTerminal", () => {
  it("renders terminal container", () => {
    const { container } = render(MiosaTerminal, {
      props: { sandboxId: "sb-4", apiKey: "key_test" },
    });
    expect(container.querySelector(".miosa-terminal")).toBeTruthy();
  });

  it("applies dark theme class by default", () => {
    const { container } = render(MiosaTerminal, {
      props: { sandboxId: "sb-4", apiKey: "key_test" },
    });
    expect(container.querySelector(".miosa-terminal--dark")).toBeTruthy();
  });
});
