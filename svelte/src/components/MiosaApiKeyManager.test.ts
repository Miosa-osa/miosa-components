import { render, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MiosaApiKeyManager from "./MiosaApiKeyManager.svelte";

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockRevoke = vi.fn();

vi.mock("@miosa/sdk", () => ({
  Miosa: vi.fn().mockImplementation(() => ({
    apiKeys: { list: mockList, create: mockCreate, revoke: mockRevoke },
  })),
}));

const KEYS = [
  {
    id: "k1",
    name: "CI Key",
    last4: "ci01",
    scopes: ["sandboxes:read"],
    created_at: "2026-01-01",
    last_used_at: "2026-05-01",
    revoked: false,
  },
  {
    id: "k2",
    name: "Prod Key",
    last4: "pr02",
    scopes: ["sandboxes:write", "workspaces:admin"],
    created_at: "2026-02-01",
    last_used_at: null,
    revoked: false,
  },
];

describe("MiosaApiKeyManager (Svelte)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    mockList.mockResolvedValue({ data: KEYS });
    mockCreate.mockResolvedValue({ secret: "msk_new_abc123", id: "k3" });
    mockRevoke.mockResolvedValue({});
  });

  it("shows loading initially", () => {
    mockList.mockImplementation(() => new Promise(() => undefined));
    const { container } = render(MiosaApiKeyManager, {
      props: { apiKey: "k" },
    });
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("renders API keys after load", async () => {
    const { findByText } = render(MiosaApiKeyManager, {
      props: { apiKey: "k" },
    });
    expect(await findByText("CI Key")).toBeTruthy();
    expect(await findByText("Prod Key")).toBeTruthy();
  });

  it("shows reveal modal after create", async () => {
    const { container, findByLabelText } = render(MiosaApiKeyManager, {
      props: { apiKey: "k" },
    });
    // Wait for keys to load
    await findByText(container, "CI Key");
    const nameInput = container.querySelector<HTMLInputElement>(
      '[aria-label="Key name"]',
    )!;
    await fireEvent.input(nameInput, { target: { value: "New Key" } });
    const form = nameInput.closest("form")!;
    await fireEvent.submit(form);
    await vi.waitFor(() =>
      expect(container.querySelector(".miosa-akm__modal")).toBeTruthy(),
    );
  });

  it("calls revoke on revoke button click", async () => {
    const { findByLabelText } = render(MiosaApiKeyManager, {
      props: { apiKey: "k" },
    });
    const btn = await findByLabelText("Revoke CI Key");
    await fireEvent.click(btn);
    await vi.waitFor(() =>
      expect(mockRevoke).toHaveBeenCalledWith({ id: "k1" }),
    );
  });
});

function findByText(container: HTMLElement, text: string) {
  return new Promise<HTMLElement>((resolve, reject) => {
    const deadline = Date.now() + 2000;
    const check = () => {
      const el = Array.from(container.querySelectorAll("*")).find(
        (e) => e.textContent?.trim() === text,
      ) as HTMLElement | undefined;
      if (el) return resolve(el);
      if (Date.now() > deadline)
        return reject(new Error(`text "${text}" not found`));
      setTimeout(check, 50);
    };
    check();
  });
}
