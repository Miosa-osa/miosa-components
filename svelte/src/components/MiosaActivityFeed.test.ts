import { render, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaActivityFeed from "./MiosaActivityFeed.svelte";

const mockStream = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    tenant: { events: { stream: mockStream } },
  })),
}));

const MOCK_ES = {
  addEventListener: vi.fn(),
  close: vi.fn(),
};

describe("MiosaActivityFeed (Svelte)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStream.mockReturnValue(MOCK_ES);
  });

  it("renders feed container", () => {
    const { container } = render(MiosaActivityFeed, {
      props: { scope: "tenant", apiKey: "k" },
    });
    expect(container.querySelector(".miosa-af")).toBeTruthy();
  });

  it("calls stream on mount", async () => {
    render(MiosaActivityFeed, { props: { scope: "tenant", apiKey: "k" } });
    await vi.waitFor(() => expect(mockStream).toHaveBeenCalled());
  });

  it("renders category filter chips", () => {
    const { container } = render(MiosaActivityFeed, {
      props: { scope: "tenant", apiKey: "k" },
    });
    expect(
      container.querySelectorAll(".miosa-af__chip").length,
    ).toBeGreaterThan(0);
  });

  it("toggles chip selection on click", async () => {
    const { container } = render(MiosaActivityFeed, {
      props: { scope: "tenant", apiKey: "k" },
    });
    const chip = container.querySelector<HTMLElement>(".miosa-af__chip")!;
    await fireEvent.click(chip);
    expect(chip.getAttribute("aria-pressed")).toBeTruthy();
  });
});
