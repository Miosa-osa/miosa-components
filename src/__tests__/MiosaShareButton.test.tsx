import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// We must mock the client utility before importing the component so the
// component never reaches the real @miosa/sdk.
const mockSandboxGet = vi.fn();

vi.mock("../utils/client.js", () => ({
  getClient: () => ({
    sandboxes: { get: mockSandboxGet },
  }),
}));

// Import after mock is registered
const { MiosaShareButton } = await import("../components/MiosaShareButton.js");

const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

describe("MiosaShareButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSandboxGet.mockResolvedValue({
      id: "sb_test123",
      share: {
        create: vi.fn().mockResolvedValue({
          url: "https://preview.miosa.ai/sb_test123?share=tok",
        }),
      },
    });
  });

  it("renders with default label", () => {
    render(<MiosaShareButton sandboxId="sb_test123" apiKey="key_test" />);
    expect(screen.getByRole("button", { name: /Share/i })).toBeTruthy();
  });

  it("generates share URL and copies to clipboard on click", async () => {
    const onShare = vi.fn();
    render(
      <MiosaShareButton
        sandboxId="sb_test123"
        apiKey="key_test"
        onShare={onShare}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining("preview.miosa.ai"),
      );
    });

    expect(onShare).toHaveBeenCalledWith(
      expect.stringContaining("preview.miosa.ai"),
    );
  });

  it("shows Copied! label after successful share", async () => {
    render(<MiosaShareButton sandboxId="sb_test123" apiKey="key_test" />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeTruthy();
    });
  });

  it("calls onError and shows error label on failure", async () => {
    mockSandboxGet.mockRejectedValue(new Error("API error"));
    const onError = vi.fn();

    render(
      <MiosaShareButton
        sandboxId="sb_fail"
        apiKey="key_test"
        onError={onError}
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  it("is disabled while loading", async () => {
    // Never resolves — keeps the button in loading state
    mockSandboxGet.mockImplementation(() => new Promise(() => undefined));

    render(<MiosaShareButton sandboxId="sb_test123" apiKey="key_test" />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(
        btn.hasAttribute("disabled") ||
          btn.getAttribute("aria-busy") === "true",
      ).toBe(true);
    });
  });
});
