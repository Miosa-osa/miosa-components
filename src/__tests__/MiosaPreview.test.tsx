import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSandboxGet = vi.fn();

vi.mock("../utils/client.js", () => ({
  getClient: () => ({
    sandboxes: { get: mockSandboxGet },
  }),
}));

const { MiosaPreview } = await import("../components/MiosaPreview.js");

describe("MiosaPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSandboxGet.mockResolvedValue({
      id: "sb_test123",
      preview_url: "https://preview.miosa.ai/sb_test123",
    });
  });

  it("renders iframe when previewToken is provided", async () => {
    render(
      <MiosaPreview
        sandboxId="sb_test123"
        previewToken="tok_abc"
        theme="dark"
      />,
    );

    await waitFor(() => {
      const frame = screen.getByTitle("Sandbox preview");
      expect(frame).toBeTruthy();
      expect(frame.getAttribute("src")).toContain("mt=tok_abc");
      expect(frame.getAttribute("src")).toContain("sb_test123");
    });
  });

  it("shows skeleton while loading", () => {
    // Never resolves — keeps component in loading state
    mockSandboxGet.mockImplementation(() => new Promise(() => undefined));

    render(<MiosaPreview sandboxId="sb_test123" apiKey="key_test" />);
    const container = document.querySelector(".miosa-preview");
    expect(container).toBeTruthy();
  });

  it("shows error state and calls onError when fetch fails", async () => {
    mockSandboxGet.mockRejectedValue(new Error("Network error"));
    const onError = vi.fn();

    render(
      <MiosaPreview sandboxId="sb_fail" apiKey="key_test" onError={onError} />,
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Preview unavailable/)).toBeTruthy();
  });

  it("resolves preview_url via apiKey", async () => {
    render(<MiosaPreview sandboxId="sb_test123" apiKey="key_test" />);

    await waitFor(() => {
      const frame = screen.getByTitle("Sandbox preview");
      expect(frame.getAttribute("src")).toContain("preview.miosa.ai");
    });
  });

  it("applies theme class to root element", async () => {
    render(
      <MiosaPreview
        sandboxId="sb_test123"
        previewToken="tok_abc"
        theme="light"
      />,
    );
    const container = document.querySelector(".miosa-preview--light");
    expect(container).toBeTruthy();
  });

  it("forwards className prop", () => {
    render(
      <MiosaPreview
        sandboxId="sb_test123"
        previewToken="tok_abc"
        className="my-custom"
      />,
    );
    const container = document.querySelector(".my-custom");
    expect(container).toBeTruthy();
  });
});
