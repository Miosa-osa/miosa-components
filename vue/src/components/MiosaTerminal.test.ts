import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import MiosaTerminal from "./MiosaTerminal.vue";

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

// xterm is a peer dep — mock dynamic import
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
    const wrapper = mount(MiosaTerminal, {
      props: { sandboxId: "sb-4", apiKey: "key_test" },
    });
    expect(wrapper.find(".miosa-terminal").exists()).toBe(true);
  });

  it("applies dark theme class by default", () => {
    const wrapper = mount(MiosaTerminal, {
      props: { sandboxId: "sb-4", apiKey: "key_test" },
    });
    expect(wrapper.find(".miosa-terminal--dark").exists()).toBe(true);
  });
});
