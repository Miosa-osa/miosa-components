import { mount, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaWorkspaceManager from "./MiosaWorkspaceManager.vue";

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockArchive = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    workspaces: { list: mockList, create: mockCreate, archive: mockArchive },
    tenant: {
      policy: vi.fn().mockResolvedValue({}),
      listMembers: vi.fn().mockResolvedValue({ data: [] }),
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

describe("MiosaWorkspaceManager (Vue)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ data: MOCK_WS });
    mockCreate.mockResolvedValue({ data: { id: "ws3" } });
    mockArchive.mockResolvedValue({});
  });

  it("shows loading initially", () => {
    mockList.mockImplementation(() => new Promise(() => undefined));
    const wrapper = mount(MiosaWorkspaceManager, { props: { apiKey: "k" } });
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
  });

  it("renders workspace list after load", async () => {
    const wrapper = mount(MiosaWorkspaceManager, { props: { apiKey: "k" } });
    await flushPromises();
    expect(wrapper.text()).toContain("Staging");
    expect(wrapper.text()).toContain("Prod");
  });

  it("creates workspace on form submit", async () => {
    const wrapper = mount(MiosaWorkspaceManager, { props: { apiKey: "k" } });
    await flushPromises();
    await wrapper.find('[aria-label="Workspace name"]').setValue("Dev env");
    await wrapper.find('[aria-label="Create workspace"]').trigger("submit");
    await flushPromises();
    expect(mockCreate).toHaveBeenCalledWith({ name: "Dev env" });
  });

  it("expands workspace detail on click", async () => {
    const wrapper = mount(MiosaWorkspaceManager, { props: { apiKey: "k" } });
    await flushPromises();
    await wrapper
      .find('[aria-label="Manage workspace Staging"]')
      .trigger("click");
    expect(wrapper.find('[role="tablist"]').exists()).toBe(true);
  });
});
