import { render, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaBrandingEditor from "./MiosaBrandingEditor.svelte";

const mockGetBranding = vi.fn();
const mockSetBranding = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    tenant: { getBranding: mockGetBranding, setBranding: mockSetBranding },
  })),
}));

const MOCK_BRANDING = {
  primary_color: "#6366f1",
  logo_url: "https://example.com/logo.png",
  error_page_title: "Oops",
  error_page_body: "Something went wrong.",
};

describe("MiosaBrandingEditor (Svelte)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBranding.mockResolvedValue(MOCK_BRANDING);
    mockSetBranding.mockResolvedValue({});
  });

  it("shows loading initially", () => {
    mockGetBranding.mockImplementation(() => new Promise(() => undefined));
    const { container } = render(MiosaBrandingEditor, {
      props: { apiKey: "k" },
    });
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("renders form fields after load", async () => {
    const { findByLabelText } = render(MiosaBrandingEditor, {
      props: { apiKey: "k" },
    });
    expect(await findByLabelText("Primary color")).toBeTruthy();
    expect(await findByLabelText("Logo URL")).toBeTruthy();
  });

  it("renders live preview panel", async () => {
    const { container, findByLabelText } = render(MiosaBrandingEditor, {
      props: { apiKey: "k" },
    });
    await findByLabelText("Primary color");
    expect(
      container.querySelector('[aria-label="Branding preview"]'),
    ).toBeTruthy();
  });

  it("calls setBranding on save", async () => {
    const { findByLabelText } = render(MiosaBrandingEditor, {
      props: { apiKey: "k" },
    });
    const btn = await findByLabelText("Save branding");
    await fireEvent.click(btn);
    await vi.waitFor(() => expect(mockSetBranding).toHaveBeenCalled());
  });
});
