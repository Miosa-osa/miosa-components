import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetBranding = vi.fn();
const mockSetBranding = vi.fn();

vi.mock("../utils/client.js", () => ({
  getClient: () => ({
    tenant: {
      getBranding: mockGetBranding,
      setBranding: mockSetBranding,
    },
  }),
}));

const { MiosaBrandingEditor } =
  await import("../components/MiosaBrandingEditor.js");

const MOCK_BRANDING = {
  product_name: "ClinicIQ",
  logo_url: "https://example.com/logo.png",
  support_url: "https://example.com/support",
  primary_color: "#4f8ef7",
  background_color: "#0d0d0d",
};

describe("MiosaBrandingEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBranding.mockResolvedValue(MOCK_BRANDING);
    mockSetBranding.mockResolvedValue({});
  });

  it("shows loading initially", () => {
    mockGetBranding.mockImplementation(() => new Promise(() => undefined));
    render(<MiosaBrandingEditor apiKey="key_test" />);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("renders form fields after load", async () => {
    render(<MiosaBrandingEditor apiKey="key_test" />);
    await waitFor(() => {
      const input = screen.getByLabelText("Product name") as HTMLInputElement;
      expect(input.value).toBe("ClinicIQ");
    });
  });

  it("renders live preview panel", async () => {
    render(<MiosaBrandingEditor apiKey="key_test" />);
    await waitFor(() => screen.getByLabelText("Branding preview"));
    expect(screen.getByText("ClinicIQ")).toBeTruthy();
  });

  it("calls setBranding on save", async () => {
    const onSave = vi.fn();
    render(<MiosaBrandingEditor apiKey="key_test" onSave={onSave} />);
    await waitFor(() => screen.getByLabelText("Product name"));

    const form = document.querySelector('[aria-label="Branding settings"]')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSetBranding).toHaveBeenCalled();
      expect(onSave).toHaveBeenCalled();
    });
  });

  it("updates preview when product name changes", async () => {
    render(<MiosaBrandingEditor apiKey="key_test" />);
    await waitFor(() => screen.getByLabelText("Product name"));

    const input = screen.getByLabelText("Product name");
    fireEvent.change(input, { target: { value: "NewBrand" } });

    expect(screen.getByText("NewBrand")).toBeTruthy();
  });
});
