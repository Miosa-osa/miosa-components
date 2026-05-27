import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUsageGet = vi.fn();

vi.mock("../utils/client.js", () => ({
  getClient: () => ({
    usage: { get: mockUsageGet },
  }),
}));

const { MiosaUsageDashboard } =
  await import("../components/MiosaUsageDashboard.js");

const MOCK_DATA = {
  totals: { sandbox_hours: 42.5, storage_gb_hours: 12.1, credits: 9900 },
  buckets: [
    {
      label: "2026-05-01",
      sandbox_hours: 10,
      storage_gb_hours: 3,
      credits: 2000,
    },
    {
      label: "2026-05-02",
      sandbox_hours: 20,
      storage_gb_hours: 5,
      credits: 4000,
    },
    {
      label: "2026-05-03",
      sandbox_hours: 12,
      storage_gb_hours: 4,
      credits: 3900,
    },
  ],
  top_users: [
    { id: "u1", email: "alice@example.com", sandbox_hours: 25, credits: 5000 },
    { id: "u2", email: "bob@example.com", sandbox_hours: 17, credits: 4900 },
  ],
};

describe("MiosaUsageDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsageGet.mockResolvedValue(MOCK_DATA);
  });

  it("shows loading state initially", () => {
    mockUsageGet.mockImplementation(() => new Promise(() => undefined));
    render(<MiosaUsageDashboard scope="tenant" apiKey="key_test" />);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("renders totals after load", async () => {
    render(<MiosaUsageDashboard scope="tenant" apiKey="key_test" />);
    await waitFor(() => {
      expect(screen.getByText(/42\.5/)).toBeTruthy();
      expect(screen.getByText(/9,900/)).toBeTruthy();
    });
  });

  it("renders SVG line charts", async () => {
    render(<MiosaUsageDashboard scope="tenant" apiKey="key_test" />);
    await waitFor(() => screen.getByText(/42\.5/));
    const svgs = document.querySelectorAll(".miosa-ud__chart-svg");
    expect(svgs.length).toBe(3);
  });

  it("renders top users table", async () => {
    render(<MiosaUsageDashboard scope="tenant" apiKey="key_test" />);
    await waitFor(() => screen.getByText("alice@example.com"));
    expect(screen.getByText("bob@example.com")).toBeTruthy();
  });

  it("passes period and scope filters to API", async () => {
    render(
      <MiosaUsageDashboard
        scope="workspace"
        id="ws1"
        apiKey="key_test"
        period="7d"
      />,
    );
    await waitFor(() => {
      expect(mockUsageGet).toHaveBeenCalledWith(
        expect.objectContaining({
          period: "7d",
          workspace_id: "ws1",
        }),
      );
    });
  });
});
