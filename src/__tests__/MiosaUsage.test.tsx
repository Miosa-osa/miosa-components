import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUsageGet = vi.fn();

vi.mock("../utils/client.js", () => ({
  getClient: () => ({
    usage: { get: mockUsageGet },
  }),
}));

const { MiosaUsage } = await import("../components/MiosaUsage.js");

describe("MiosaUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsageGet.mockResolvedValue({
      total: 12345,
      unit: "seconds",
      buckets: [
        { date: "2026-05-01", value: 100 },
        { date: "2026-05-02", value: 250 },
        { date: "2026-05-03", value: 80 },
      ],
    });
  });

  it("renders total and unit after loading", async () => {
    render(
      <MiosaUsage externalUserId="user_abc" apiKey="key_test" period="30d" />,
    );

    await waitFor(() => {
      expect(screen.getByText(/12,345 seconds/)).toBeTruthy();
    });
  });

  it("shows loading skeleton initially", () => {
    // Never resolves — keeps component in loading state
    mockUsageGet.mockImplementation(() => new Promise(() => undefined));

    render(<MiosaUsage externalUserId="user_abc" apiKey="key_test" />);
    const el = document.querySelector('[aria-busy="true"]');
    expect(el).toBeTruthy();
  });

  it("renders SVG bar chart with correct bar count", async () => {
    render(<MiosaUsage externalUserId="user_abc" apiKey="key_test" />);

    await waitFor(() => screen.getByText(/seconds/));
    const bars = document.querySelectorAll(".miosa-usage__bar");
    expect(bars.length).toBe(3);
  });

  it("renders period label", async () => {
    render(
      <MiosaUsage externalUserId="user_abc" apiKey="key_test" period="7d" />,
    );

    await waitFor(() => {
      expect(screen.getByText("7d")).toBeTruthy();
    });
  });

  it("calls onError on API failure", async () => {
    mockUsageGet.mockRejectedValue(new Error("Forbidden"));
    const onError = vi.fn();

    render(
      <MiosaUsage
        externalUserId="user_fail"
        apiKey="key_test"
        onError={onError}
      />,
    );

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
