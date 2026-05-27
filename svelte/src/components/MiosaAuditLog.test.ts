import { render, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaAuditLog from "./MiosaAuditLog.svelte";

const mockList = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({ audit_log: { list: mockList } })),
}));

const EVENTS = [
  {
    id: "ev1",
    ts: "2026-05-01T12:00:00Z",
    type: "sandbox.created",
    actor: "alice@example.com",
    resource: "sb_abc",
    data: { sandbox_id: "sb_abc" },
  },
  {
    id: "ev2",
    ts: "2026-05-01T13:00:00Z",
    type: "member.invited",
    actor: "admin@example.com",
    resource: "t_1",
    data: { email: "new@example.com" },
  },
];

describe("MiosaAuditLog (Svelte)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Always return fresh array to avoid duplicate key across re-renders
    mockList.mockResolvedValue({ events: [...EVENTS] });
  });

  it("shows loading initially", () => {
    mockList.mockImplementation(() => new Promise(() => undefined));
    const { container } = render(MiosaAuditLog, { props: { apiKey: "k" } });
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("renders events after load", async () => {
    const { findByText } = render(MiosaAuditLog, { props: { apiKey: "k" } });
    expect(await findByText("sandbox.created")).toBeTruthy();
    expect(await findByText("member.invited")).toBeTruthy();
  });

  it("expands event JSON on click", async () => {
    const { findByLabelText, container } = render(MiosaAuditLog, {
      props: { apiKey: "k" },
    });
    const btn = await findByLabelText("Event sandbox.created");
    await fireEvent.click(btn);
    expect(
      container.querySelector(".miosa-al__item-json")!.textContent,
    ).toContain("sb_abc");
  });

  it("renders Export CSV button", async () => {
    const { findByLabelText } = render(MiosaAuditLog, {
      props: { apiKey: "k" },
    });
    expect(await findByLabelText("Export CSV")).toBeTruthy();
  });

  it("passes filters to API", async () => {
    render(MiosaAuditLog, {
      props: { apiKey: "k", filters: { action: "sandbox.created" } },
    });
    await vi.waitFor(() =>
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ action: "sandbox.created" }),
      ),
    );
  });
});
