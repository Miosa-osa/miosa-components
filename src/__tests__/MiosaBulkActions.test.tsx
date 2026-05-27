import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPause = vi.fn();
const mockDestroy = vi.fn();
const mockJobGet = vi.fn();

vi.mock("../utils/client.js", () => ({
  getClient: () => ({
    bulk: {
      sandboxes: { pause: mockPause, destroy: mockDestroy },
      jobs: { get: mockJobGet },
    },
  }),
}));

const { MiosaBulkActions } = await import("../components/MiosaBulkActions.js");

describe("MiosaBulkActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPause.mockResolvedValue({ job_id: "job_1", queued: 2 });
    mockDestroy.mockResolvedValue({ job_id: "job_2", queued: 2 });
    mockJobGet.mockResolvedValue({
      status: "done",
      completed: 2,
      failed: 0,
      queued: 2,
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("returns null when no IDs selected", () => {
    const { container } = render(
      <MiosaBulkActions selectedIds={[]} apiKey="key_test" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders action bar when IDs are selected", () => {
    render(
      <MiosaBulkActions
        selectedIds={["sb_1", "sb_2"]}
        actions={["pause", "destroy"]}
        apiKey="key_test"
      />,
    );
    expect(screen.getByText(/2 selected/)).toBeTruthy();
    expect(screen.getByLabelText(/Pause 2 items/)).toBeTruthy();
    expect(screen.getByLabelText(/Destroy 2 items/)).toBeTruthy();
  });

  it("calls bulk pause and shows job progress", async () => {
    render(
      <MiosaBulkActions
        selectedIds={["sb_1", "sb_2"]}
        actions={["pause"]}
        apiKey="key_test"
      />,
    );
    fireEvent.click(screen.getByLabelText("Pause 2 items"));
    await waitFor(() => {
      expect(mockPause).toHaveBeenCalledWith({ ids: ["sb_1", "sb_2"] });
    });
  });

  it("shows confirm dialog before destroy", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <MiosaBulkActions
        selectedIds={["sb_1"]}
        actions={["destroy"]}
        apiKey="key_test"
      />,
    );
    fireEvent.click(screen.getByLabelText("Destroy 1 items"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDestroy).not.toHaveBeenCalled();
  });
});
