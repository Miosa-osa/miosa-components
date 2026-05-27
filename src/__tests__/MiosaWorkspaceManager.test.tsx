import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockArchive = vi.fn();

vi.mock("../utils/client.js", () => ({
  getClient: () => ({
    workspaces: {
      list: mockList,
      create: mockCreate,
      archive: mockArchive,
    },
    tenant: {
      policy: vi.fn().mockResolvedValue({}),
      listMembers: vi.fn().mockResolvedValue({ data: [] }),
    },
  }),
}));

const { MiosaWorkspaceManager } =
  await import("../components/MiosaWorkspaceManager.js");

const MOCK_WORKSPACES = [
  {
    id: "ws1",
    name: "Staging",
    slug: "staging",
    archived: false,
    created_at: "2026-01-01",
  },
  {
    id: "ws2",
    name: "Production",
    slug: "production",
    archived: true,
    created_at: "2026-01-02",
  },
];

describe("MiosaWorkspaceManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ data: MOCK_WORKSPACES });
    mockCreate.mockResolvedValue({ data: { id: "ws3", name: "New WS" } });
    mockArchive.mockResolvedValue({});
  });

  it("shows loading initially", () => {
    mockList.mockImplementation(() => new Promise(() => undefined));
    render(<MiosaWorkspaceManager apiKey="key_test" />);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("renders workspace list", async () => {
    render(<MiosaWorkspaceManager apiKey="key_test" />);
    await waitFor(() => {
      expect(screen.getByText("Staging")).toBeTruthy();
      expect(screen.getByText("Production")).toBeTruthy();
    });
  });

  it("creates workspace on form submit", async () => {
    render(<MiosaWorkspaceManager apiKey="key_test" />);
    await waitFor(() => screen.getByText("Staging"));

    const input = screen.getByLabelText("Workspace name");
    fireEvent.change(input, { target: { value: "Dev env" } });

    const form = document.querySelector('[aria-label="Create workspace"]')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ name: "Dev env" });
    });
  });

  it("expands workspace detail on click", async () => {
    render(<MiosaWorkspaceManager apiKey="key_test" />);
    await waitFor(() => screen.getByText("Staging"));

    fireEvent.click(screen.getByLabelText("Manage workspace Staging"));
    expect(screen.getByRole("tab", { name: "Policy" })).toBeTruthy();
  });
});
