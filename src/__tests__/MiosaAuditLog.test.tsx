import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuditList = vi.fn();

vi.mock("../utils/client.js", () => ({
  getClient: () => ({
    audit_log: { list: mockAuditList },
  }),
}));

const { MiosaAuditLog } = await import("../components/MiosaAuditLog.js");

const MOCK_EVENTS = [
  {
    id: "ev1",
    ts: "2026-05-01T12:00:00Z",
    type: "sandbox.created",
    actor: "alice@example.com",
    resource: "sandbox/sb_abc",
    data: { sandbox_id: "sb_abc" },
  },
  {
    id: "ev2",
    ts: "2026-05-01T13:00:00Z",
    type: "member.invited",
    actor: "admin@example.com",
    resource: "tenant/t_1",
    data: { email: "new@example.com" },
  },
];

describe("MiosaAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditList.mockResolvedValue({ events: MOCK_EVENTS });
  });

  it("shows loading initially", () => {
    mockAuditList.mockImplementation(() => new Promise(() => undefined));
    render(<MiosaAuditLog apiKey="key_test" />);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("renders events after load", async () => {
    render(<MiosaAuditLog apiKey="key_test" />);
    await waitFor(() => {
      expect(screen.getByText("sandbox.created")).toBeTruthy();
      expect(screen.getByText("member.invited")).toBeTruthy();
    });
  });

  it("expands event JSON on click", async () => {
    render(<MiosaAuditLog apiKey="key_test" />);
    await waitFor(() => screen.getByText("sandbox.created"));

    fireEvent.click(screen.getByLabelText("Event sandbox.created"));
    await waitFor(() => {
      const pre = document.querySelector(".miosa-al__item-json");
      expect(pre?.textContent).toContain("sb_abc");
    });
  });

  it("renders Export CSV button", async () => {
    render(<MiosaAuditLog apiKey="key_test" />);
    await waitFor(() => screen.getByLabelText("Export CSV"));
  });

  it("passes filters to API", async () => {
    render(
      <MiosaAuditLog
        apiKey="key_test"
        filters={{ action: "sandbox.created" }}
      />,
    );
    await waitFor(() => {
      expect(mockAuditList).toHaveBeenCalledWith(
        expect.objectContaining({ action: "sandbox.created" }),
      );
    });
  });
});
