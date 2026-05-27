import "@testing-library/jest-dom";

// Stub ResizeObserver — not available in jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

// Stub WebSocket
globalThis.WebSocket = class MockWebSocket {
  static OPEN = 1;
  readyState = 1;
  binaryType = "blob";
  addEventListener(): void {}
  removeEventListener(): void {}
  send(): void {}
  close(): void {}
} as unknown as typeof WebSocket;
