import { render, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaBulkActions from "./MiosaBulkActions.svelte";

const mockBulkPause = vi.fn();
const mockBulkDestroy = vi.fn();
const mockJobGet = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    bulk: {
      sandboxes: { pause: mockBulkPause, destroy: mockBulkDestroy },
      jobs: { get: mockJobGet },
    },
  })),
}));

describe("MiosaBulkActions (Svelte)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    mockBulkPause.mockResolvedValue({ job_id: "j1", queued: 2 });
    mockBulkDestroy.mockResolvedValue({ job_id: "j2", queued: 1 });
    mockJobGet.mockResolvedValue({
      status: "done",
      completed: 1,
      failed: 0,
      queued: 1,
    });
  });

  it("renders nothing when no items selected", () => {
    const { container } = render(MiosaBulkActions, {
      props: { selectedIds: [], apiKey: "k" },
    });
    expect(container.querySelector(".miosa-ba")).toBeNull();
  });

  it("renders bar when items selected", () => {
    const { container } = render(MiosaBulkActions, {
      props: { selectedIds: ["s1", "s2"], apiKey: "k" },
    });
    expect(container.querySelector(".miosa-ba")).toBeTruthy();
  });

  it("shows selection count", () => {
    const { container } = render(MiosaBulkActions, {
      props: { selectedIds: ["s1", "s2"], apiKey: "k" },
    });
    expect(container.textContent).toContain("2");
  });

  it("calls bulk pause on action button click", async () => {
    const { findByLabelText } = render(MiosaBulkActions, {
      props: { selectedIds: ["s1"], actions: ["pause"], apiKey: "k" },
    });
    const btn = await findByLabelText("Pause 1 items");
    await fireEvent.click(btn);
    await vi.waitFor(() =>
      expect(mockBulkPause).toHaveBeenCalledWith({ ids: ["s1"] }),
    );
  });

  it("calls window.confirm for destructive action", async () => {
    const { findByLabelText } = render(MiosaBulkActions, {
      props: { selectedIds: ["s1"], actions: ["destroy"], apiKey: "k" },
    });
    const btn = await findByLabelText("Destroy 1 items");
    await fireEvent.click(btn);
    expect(window.confirm).toHaveBeenCalled();
  });
});
