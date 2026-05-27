import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListMembers = vi.fn();
const mockInviteMember = vi.fn();
const mockRemoveMember = vi.fn();
const mockChangeMemberRole = vi.fn();

vi.mock("../utils/client.js", () => ({
  getClient: () => ({
    tenant: {
      listMembers: mockListMembers,
      inviteMember: mockInviteMember,
      removeMember: mockRemoveMember,
      changeMemberRole: mockChangeMemberRole,
    },
  }),
}));

const { MiosaMemberManager } =
  await import("../components/MiosaMemberManager.js");

const MOCK_MEMBERS = [
  { id: "m1", email: "alice@example.com", role: "admin", status: "active" },
  { id: "m2", email: "bob@example.com", role: "developer", status: "pending" },
];

describe("MiosaMemberManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListMembers.mockResolvedValue({ data: MOCK_MEMBERS });
    mockInviteMember.mockResolvedValue({});
    mockRemoveMember.mockResolvedValue({});
    mockChangeMemberRole.mockResolvedValue({});
  });

  it("renders loading state initially", () => {
    mockListMembers.mockImplementation(() => new Promise(() => undefined));
    render(<MiosaMemberManager scope="tenant" apiKey="key_test" />);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("renders member list after loading", async () => {
    render(<MiosaMemberManager scope="tenant" apiKey="key_test" />);
    await waitFor(() => {
      expect(screen.getByText("alice@example.com")).toBeTruthy();
      expect(screen.getByText("bob@example.com")).toBeTruthy();
    });
  });

  it("submits invite form", async () => {
    render(<MiosaMemberManager scope="tenant" apiKey="key_test" />);
    await waitFor(() => screen.getByText("alice@example.com"));

    const emailInput = screen.getByLabelText("Invite email");
    fireEvent.change(emailInput, { target: { value: "carol@example.com" } });

    const form = document.querySelector('[aria-label="Invite member"]')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockInviteMember).toHaveBeenCalledWith(
        expect.objectContaining({ email: "carol@example.com" }),
      );
    });
  });

  it("filters members by search", async () => {
    render(<MiosaMemberManager scope="tenant" apiKey="key_test" />);
    await waitFor(() => screen.getByText("alice@example.com"));

    const search = screen.getByLabelText("Search members");
    fireEvent.change(search, { target: { value: "alice" } });

    expect(screen.queryByText("bob@example.com")).toBeNull();
    expect(screen.getByText("alice@example.com")).toBeTruthy();
  });

  it("calls onError on API failure", async () => {
    mockListMembers.mockRejectedValue(new Error("network error"));
    const onError = vi.fn();
    render(
      <MiosaMemberManager scope="tenant" apiKey="key_test" onError={onError} />,
    );
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "network error" }),
      );
    });
  });
});
