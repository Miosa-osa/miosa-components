import { mount, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaBulkActions from "./MiosaBulkActions.vue";

const mockPause = vi.fn();
const mockDestroy = vi.fn();
const mockJobGet = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    bulk: {
      sandboxes: { pause: mockPause, destroy: mockDestroy },
      jobs: { get: mockJobGet },
    },
  })),
}));

describe("MiosaBulkActions (Vue)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPause.mockResolvedValue({ job_id: "job_1", queued: 2 });
    mockDestroy.mockResolvedValue({ job_id: "job_2", queued: 2 });
    mockJobGet.mockResolvedValue({
      status: "done",
      completed: 2,
      failed: 0,
      queued: 2,
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("renders nothing when no IDs selected", () => {
    const wrapper = mount(MiosaBulkActions, {
      props: { selectedIds: [], apiKey: "k" },
    });
    expect(wrapper.find(".miosa-ba__bar").exists()).toBe(false);
  });

  it("renders action bar when IDs are selected", () => {
    const wrapper = mount(MiosaBulkActions, {
      props: {
        selectedIds: ["sb_1", "sb_2"],
        actions: ["pause", "destroy"],
        apiKey: "k",
      },
    });
    expect(wrapper.text()).toContain("2 selected");
    expect(wrapper.find('[aria-label="Pause 2 items"]').exists()).toBe(true);
  });

  it("calls bulk pause on click", async () => {
    const wrapper = mount(MiosaBulkActions, {
      props: { selectedIds: ["sb_1", "sb_2"], actions: ["pause"], apiKey: "k" },
    });
    await wrapper.find('[aria-label="Pause 2 items"]').trigger("click");
    await flushPromises();
    expect(mockPause).toHaveBeenCalledWith({ ids: ["sb_1", "sb_2"] });
  });

  it("requires confirmation before destroy", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const wrapper = mount(MiosaBulkActions, {
      props: { selectedIds: ["sb_1"], actions: ["destroy"], apiKey: "k" },
    });
    await wrapper.find('[aria-label="Destroy 1 items"]').trigger("click");
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDestroy).not.toHaveBeenCalled();
  });
});
