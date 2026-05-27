import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MiosaUsage from "./MiosaUsage.svelte";

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    usage: {
      get: vi.fn().mockResolvedValue({
        compute_seconds: 3600,
        storage_gb_hours: 0.5,
        egress_gb: 0.1,
        period_start: "2026-05-01",
        period_end: "2026-05-26",
      }),
    },
  })),
}));

describe("MiosaUsage", () => {
  it("renders loading state initially", () => {
    const { getByText } = render(MiosaUsage, {
      props: { externalUserId: "user-1", apiKey: "key_test" },
    });
    expect(getByText("Loading usage…")).toBeTruthy();
  });

  it("has correct aria region", () => {
    const { container } = render(MiosaUsage, {
      props: { externalUserId: "user-1", apiKey: "key_test" },
    });
    expect(
      container.querySelector('[aria-label="Usage statistics"]'),
    ).toBeTruthy();
  });
});
