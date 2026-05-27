import { mount, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaBrandingEditor from "./MiosaBrandingEditor.vue";

const mockGetBranding = vi.fn();
const mockSetBranding = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    tenant: { getBranding: mockGetBranding, setBranding: mockSetBranding },
  })),
}));

const MOCK_BRANDING = {
  product_name: "ClinicIQ",
  logo_url: "https://example.com/logo.png",
  support_url: "https://example.com/support",
  primary_color: "#4f8ef7",
  background_color: "#0d0d0d",
};

describe("MiosaBrandingEditor (Vue)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBranding.mockResolvedValue(MOCK_BRANDING);
    mockSetBranding.mockResolvedValue({});
  });

  it("shows loading initially", () => {
    mockGetBranding.mockImplementation(() => new Promise(() => undefined));
    const wrapper = mount(MiosaBrandingEditor, { props: { apiKey: "k" } });
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
  });

  it("renders form fields with loaded values", async () => {
    const wrapper = mount(MiosaBrandingEditor, { props: { apiKey: "k" } });
    await flushPromises();
    const input = wrapper.find('[aria-label="Product name"]') as ReturnType<
      typeof wrapper.find
    >;
    expect((input.element as HTMLInputElement).value).toBe("ClinicIQ");
  });

  it("renders live preview panel", async () => {
    const wrapper = mount(MiosaBrandingEditor, { props: { apiKey: "k" } });
    await flushPromises();
    expect(wrapper.find('[aria-label="Branding preview"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("ClinicIQ");
  });

  it("calls setBranding on save", async () => {
    const onSave = vi.fn();
    const wrapper = mount(MiosaBrandingEditor, {
      props: { apiKey: "k", onSave },
    });
    await flushPromises();
    await wrapper.find('[aria-label="Branding settings"]').trigger("submit");
    await flushPromises();
    expect(mockSetBranding).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalled();
  });

  it("updates preview when product name changes", async () => {
    const wrapper = mount(MiosaBrandingEditor, { props: { apiKey: "k" } });
    await flushPromises();
    await wrapper.find('[aria-label="Product name"]').setValue("NewBrand");
    expect(wrapper.text()).toContain("NewBrand");
  });
});
