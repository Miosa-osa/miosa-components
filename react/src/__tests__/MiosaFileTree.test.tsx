import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSandboxGet = vi.fn();

vi.mock("../utils/client.js", () => ({
  getClient: () => ({
    sandboxes: { get: mockSandboxGet },
  }),
}));

const { MiosaFileTree } = await import("../components/MiosaFileTree.js");

const MOCK_TREE = [
  {
    path: "/workspace/src",
    name: "src",
    type: "directory",
    children: [
      { path: "/workspace/src/index.ts", name: "index.ts", type: "file" },
    ],
  },
  { path: "/workspace/package.json", name: "package.json", type: "file" },
];

describe("MiosaFileTree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSandboxGet.mockResolvedValue({
      id: "sb_test123",
      files: {
        tree: vi.fn().mockResolvedValue(MOCK_TREE),
        watch: vi.fn().mockResolvedValue(() => undefined),
      },
    });
  });

  it("renders file tree after loading", async () => {
    render(<MiosaFileTree sandboxId="sb_test123" apiKey="key_test" />);

    await waitFor(() => {
      expect(screen.getByText("src")).toBeTruthy();
      expect(screen.getByText("package.json")).toBeTruthy();
    });
  });

  it("shows loading state initially", () => {
    // Never resolves
    mockSandboxGet.mockImplementation(() => new Promise(() => undefined));

    render(<MiosaFileTree sandboxId="sb_test123" apiKey="key_test" />);
    const container = document.querySelector('[aria-busy="true"]');
    expect(container).toBeTruthy();
  });

  it("expands directory on click", async () => {
    render(<MiosaFileTree sandboxId="sb_test123" apiKey="key_test" />);

    await waitFor(() => screen.getByText("src"));
    fireEvent.click(screen.getByText("src").closest("button")!);

    await waitFor(() => {
      expect(screen.getByText("index.ts")).toBeTruthy();
    });
  });

  it("calls onSelect when a file is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <MiosaFileTree
        sandboxId="sb_test123"
        apiKey="key_test"
        onSelect={onSelect}
      />,
    );

    await waitFor(() => screen.getByText("package.json"));
    fireEvent.click(screen.getByText("package.json").closest("button")!);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: "package.json", type: "file" }),
    );
  });

  it("shows error state on fetch failure", async () => {
    mockSandboxGet.mockRejectedValue(new Error("Fetch failed"));
    const onError = vi.fn();

    render(
      <MiosaFileTree sandboxId="sb_fail" apiKey="key_test" onError={onError} />,
    );

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
