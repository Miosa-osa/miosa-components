import { render, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaWorkspaceManager from "./MiosaWorkspaceManager.svelte";

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockArchive = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    workspaces: { list: mockList, create: mockCreate, archive: mockArchive },
    tenant: {
      policy: vi.fn().mockResolvedValue({}),
      listMembers: vi.fn().mockResolvedValue({ data: [] }),
      setPolicy: vi.fn().mockResolvedValue({}),
    },
    externalUsers: {},
  })),
}));

const MOCK_WS = [
  {
    id: "ws1",
    name: "Staging",
    slug: "staging",
    archived: false,
    created_at: "2026-01-01",
  },
  {
    id: "ws2",
    name: "Prod",
    slug: "prod",
    archived: true,
    created_at: "2026-01-02",
  },
];

describe("MiosaWorkspaceManager (Svelte)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ data: MOCK_WS });
    mockCreate.mockResolvedValue({ data: { id: "ws3" } });
    mockArchive.mockResolvedValue({});
  });

  it("shows loading initially", () => {
    mockList.mockImplementation(() => new Promise(() => undefined));
    const { container } = render(MiosaWorkspaceManager, {
      props: { apiKey: "k" },
    });
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("renders workspace list after load", async () => {
    const { findByText } = render(MiosaWorkspaceManager, {
      props: { apiKey: "k" },
    });
    expect(await findByText("Staging")).toBeTruthy();
    expect(await findByText("Prod")).toBeTruthy();
  });

  it("creates workspace on form submit", async () => {
    const { findByLabelText } = render(MiosaWorkspaceManager, {
      props: { apiKey: "k" },
    });
    const input = await findByLabelText("Workspace name");
    await fireEvent.input(input, { target: { value: "Dev env" } });
    await fireEvent.submit(input.closest("form")!);
    await vi.waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({ name: "Dev env" }),
    );
  });

  it("expands workspace detail on button click", async () => {
    const { findByLabelText, container } = render(MiosaWorkspaceManager, {
      props: { apiKey: "k" },
    });
    const btn = await findByLabelText("Manage workspace Staging");
    await fireEvent.click(btn);
    expect(container.querySelector('[role="tablist"]')).toBeTruthy();
  });
});
