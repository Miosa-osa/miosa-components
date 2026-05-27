import { render, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaPolicyEditor from "./MiosaPolicyEditor.svelte";

const mockPolicy = vi.fn();
const mockSetPolicy = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    tenant: { policy: mockPolicy, setPolicy: mockSetPolicy },
    workspaces: {},
    externalUsers: {},
  })),
}));

const MOCK = {
  lifecycle: {
    default_idle_timeout_sec: { value: 1800, source: "tenant" },
    default_timeout_sec: { value: 86400, source: "platform" },
  },
  quotas: { max_sandboxes: { value: 5, source: "platform" } },
  sizing: {},
  templates: {},
  features: {},
  egress: {},
  branding: {},
  webhooks: {},
};

describe("MiosaPolicyEditor (Svelte)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPolicy.mockResolvedValue(MOCK);
    mockSetPolicy.mockResolvedValue({});
  });

  it("renders loading skeleton initially", () => {
    mockPolicy.mockImplementation(() => new Promise(() => undefined));
    const { container } = render(MiosaPolicyEditor, {
      props: { scope: "tenant", apiKey: "k" },
    });
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("renders category sections after load", async () => {
    const { findByText } = render(MiosaPolicyEditor, {
      props: { scope: "tenant", apiKey: "k" },
    });
    expect(await findByText("lifecycle")).toBeTruthy();
    expect(await findByText("quotas")).toBeTruthy();
  });

  it("expands section on click and shows field key", async () => {
    const { findByText, container } = render(MiosaPolicyEditor, {
      props: { scope: "tenant", apiKey: "k" },
    });
    const btn = await findByText("lifecycle");
    await fireEvent.click(btn.closest("button")!);
    expect(container.textContent).toContain("default_idle_timeout_sec");
  });

  it("renders effective policy preview panel", async () => {
    const { container, findByText } = render(MiosaPolicyEditor, {
      props: { scope: "tenant", apiKey: "k" },
    });
    await findByText("lifecycle");
    expect(
      container.querySelector('[aria-label="Effective policy preview"]'),
    ).toBeTruthy();
  });

  it("calls setPolicy on save click", async () => {
    const { findByLabelText } = render(MiosaPolicyEditor, {
      props: { scope: "tenant", apiKey: "k" },
    });
    const btn = await findByLabelText("Save policy");
    await fireEvent.click(btn);
    await vi.waitFor(() => expect(mockSetPolicy).toHaveBeenCalled());
  });
});
