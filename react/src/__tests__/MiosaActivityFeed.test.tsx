import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock EventSource
class MockEventSource {
  onopen: (() => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  close = vi.fn();

  static instances: MockEventSource[] = [];

  constructor() {
    MockEventSource.instances.push(this);
  }

  fire(data: unknown) {
    this.onmessage?.(
      new MessageEvent("message", { data: JSON.stringify(data) }),
    );
  }
}

const mockStream = vi.fn();

vi.mock("../utils/client.js", () => ({
  getClient: () => ({
    tenant: {
      events: {
        stream: mockStream,
      },
    },
  }),
}));

const { MiosaActivityFeed } =
  await import("../components/MiosaActivityFeed.js");

describe("MiosaActivityFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.instances = [];
    const es = new MockEventSource();
    mockStream.mockReturnValue(es);
  });

  it("renders disconnected state initially", () => {
    render(<MiosaActivityFeed apiKey="key_test" />);
    expect(screen.getByLabelText("Disconnected")).toBeTruthy();
  });

  it("shows category filter chips", () => {
    render(<MiosaActivityFeed apiKey="key_test" />);
    expect(screen.getByRole("button", { name: "sandbox" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "member" })).toBeTruthy();
  });

  it("renders incoming SSE events", async () => {
    render(<MiosaActivityFeed apiKey="key_test" />);
    const es = MockEventSource.instances[0]!;
    act(() => {
      es.fire({
        id: "ev1",
        ts: new Date().toISOString(),
        type: "sandbox.ready",
        actor: "system",
        resource: "sb_abc",
      });
    });
    await waitFor(() => {
      expect(screen.getByText("sandbox.ready")).toBeTruthy();
    });
  });

  it("toggles category filter chip active state", () => {
    render(<MiosaActivityFeed apiKey="key_test" />);
    const chip = screen.getByRole("button", { name: "sandbox" });
    expect(chip.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(chip);
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(chip);
    expect(chip.getAttribute("aria-pressed")).toBe("false");
  });

  it("cleans up EventSource on unmount", () => {
    const { unmount } = render(<MiosaActivityFeed apiKey="key_test" />);
    const es = MockEventSource.instances[0]!;
    unmount();
    expect(es.close).toHaveBeenCalled();
  });
});
