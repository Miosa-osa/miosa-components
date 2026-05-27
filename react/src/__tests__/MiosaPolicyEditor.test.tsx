import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTenantPolicy = vi.fn();
const mockTenantSetPolicy = vi.fn();

vi.mock("../utils/client.js", () => ({
  getClient: () => ({
    tenant: {
      policy: mockTenantPolicy,
      setPolicy: mockTenantSetPolicy,
    },
  }),
}));

const { MiosaPolicyEditor } =
  await import("../components/MiosaPolicyEditor.js");

const MOCK_EFFECTIVE = {
  lifecycle: {
    default_idle_timeout_sec: { value: 1800, source: "tenant" },
    default_timeout_sec: { value: 86400, source: "platform" },
  },
  quotas: {
    max_sandboxes: { value: 5, source: "platform" },
  },
  sizing: {},
  templates: {},
  features: {},
  egress: {},
  branding: {},
  webhooks: {},
};

describe("MiosaPolicyEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTenantPolicy.mockResolvedValue(MOCK_EFFECTIVE);
    mockTenantSetPolicy.mockResolvedValue({});
  });

  it("renders loading state initially", () => {
    mockTenantPolicy.mockImplementation(() => new Promise(() => undefined));
    render(<MiosaPolicyEditor scope="tenant" apiKey="key_test" />);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("renders collapsible category sections after load", async () => {
    render(<MiosaPolicyEditor scope="tenant" apiKey="key_test" />);
    await waitFor(() => {
      expect(screen.getByText("lifecycle")).toBeTruthy();
    });
    expect(screen.getByText("quotas")).toBeTruthy();
  });

  it("expands a section on click", async () => {
    render(<MiosaPolicyEditor scope="tenant" apiKey="key_test" />);
    await waitFor(() => screen.getByText("lifecycle"));
    const toggleBtn = screen.getByText("lifecycle").closest("button")!;
    fireEvent.click(toggleBtn);
    await waitFor(() => {
      // field is inherited so rendered as a span, check key text and Override button
      expect(screen.getByText("default_idle_timeout_sec")).toBeTruthy();
      expect(
        screen.getByLabelText("Override default_idle_timeout_sec"),
      ).toBeTruthy();
    });
  });

  it("calls setPolicy on save", async () => {
    render(
      <MiosaPolicyEditor scope="tenant" apiKey="key_test" onSave={vi.fn()} />,
    );
    await waitFor(() => screen.getByText("lifecycle"));
    const saveBtn = screen.getByRole("button", { name: "Save policy" });
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(mockTenantSetPolicy).toHaveBeenCalled();
    });
  });

  it("renders effective policy preview panel", async () => {
    render(<MiosaPolicyEditor scope="tenant" apiKey="key_test" />);
    await waitFor(() => screen.getByLabelText("Effective policy preview"));
  });

  it("calls onError when API fails", async () => {
    mockTenantPolicy.mockRejectedValue(new Error("API down"));
    const onError = vi.fn();
    render(
      <MiosaPolicyEditor scope="tenant" apiKey="key_test" onError={onError} />,
    );
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "API down" }),
      );
    });
  });
});
