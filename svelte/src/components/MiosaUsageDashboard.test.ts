import { render } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaUsageDashboard from "./MiosaUsageDashboard.svelte";

const mockGet = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({ usage: { get: mockGet } })),
}));

const MOCK = {
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
  ],
  top_users: [
    { id: "u1", email: "alice@example.com", sandbox_hours: 25, credits: 5000 },
  ],
};

describe("MiosaUsageDashboard (Svelte)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(MOCK);
  });

  it("shows loading initially", () => {
    mockGet.mockImplementation(() => new Promise(() => undefined));
    const { container } = render(MiosaUsageDashboard, {
      props: { scope: "tenant", apiKey: "k" },
    });
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("renders totals after load", async () => {
    const { findByText } = render(MiosaUsageDashboard, {
      props: { scope: "tenant", apiKey: "k" },
    });
    expect(await findByText(/42\.5/)).toBeTruthy();
    expect(await findByText(/9,900/)).toBeTruthy();
  });

  it("renders SVG line charts", async () => {
    const { container, findByText } = render(MiosaUsageDashboard, {
      props: { scope: "tenant", apiKey: "k" },
    });
    await findByText(/42\.5/);
    expect(container.querySelectorAll(".miosa-ud__chart-svg").length).toBe(3);
  });

  it("renders top users table", async () => {
    const { findByText } = render(MiosaUsageDashboard, {
      props: { scope: "tenant", apiKey: "k" },
    });
    expect(await findByText("alice@example.com")).toBeTruthy();
  });

  it("passes period and scope to API", async () => {
    render(MiosaUsageDashboard, {
      props: { scope: "workspace", id: "ws1", apiKey: "k", period: "7d" },
    });
    await vi.waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        expect.objectContaining({ period: "7d", workspace_id: "ws1" }),
      ),
    );
  });
});
