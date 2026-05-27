import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockRevoke = vi.fn();

vi.mock("../utils/client.js", () => ({
  getClient: () => ({
    apiKeys: {
      list: mockList,
      create: mockCreate,
      revoke: mockRevoke,
    },
  }),
}));

const { MiosaApiKeyManager } =
  await import("../components/MiosaApiKeyManager.js");

const MOCK_KEYS = [
  {
    id: "k1",
    name: "CI key",
    last4: "ab12",
    scopes: ["sandboxes:read", "sandboxes:write"],
    created_at: "2026-01-01T00:00:00Z",
    last_used_at: "2026-05-01T00:00:00Z",
  },
  {
    id: "k2",
    name: "Read-only",
    last4: "cd34",
    scopes: ["sandboxes:read"],
    created_at: "2026-02-01T00:00:00Z",
    external_user_id: "user_abc",
  },
];

describe("MiosaApiKeyManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ data: MOCK_KEYS });
    mockCreate.mockResolvedValue({ secret: "sk_live_supersecret123" });
    mockRevoke.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("shows loading initially", () => {
    mockList.mockImplementation(() => new Promise(() => undefined));
    render(<MiosaApiKeyManager apiKey="key_test" />);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("renders key list after load", async () => {
    render(<MiosaApiKeyManager apiKey="key_test" />);
    await waitFor(() => {
      expect(screen.getByText("CI key")).toBeTruthy();
      expect(screen.getByText("Read-only")).toBeTruthy();
    });
  });

  it("shows L2 badge for scoped keys", async () => {
    render(<MiosaApiKeyManager apiKey="key_test" />);
    await waitFor(() => screen.getByText("Read-only"));
    expect(document.querySelector(".miosa-akm__item-badge")).toBeTruthy();
  });

  it("creates key and shows reveal modal", async () => {
    render(<MiosaApiKeyManager apiKey="key_test" />);
    await waitFor(() => screen.getByLabelText("Key name"));

    fireEvent.change(screen.getByLabelText("Key name"), {
      target: { value: "My new key" },
    });

    const form = document.querySelector('[aria-label="Create API key"]')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("sk_live_supersecret123")).toBeTruthy();
    });
  });

  it("revokes key with confirmation", async () => {
    render(<MiosaApiKeyManager apiKey="key_test" />);
    await waitFor(() => screen.getByText("CI key"));

    fireEvent.click(screen.getByLabelText("Revoke CI key"));

    await waitFor(() => {
      expect(mockRevoke).toHaveBeenCalledWith({ id: "k1" });
    });
  });
});
