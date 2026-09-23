import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
  window.URL.createObjectURL = () => "blob:mock-url";
  window.URL.revokeObjectURL = () => {};
}

if (typeof globalThis !== "undefined" && globalThis.URL) {
  globalThis.URL.createObjectURL = () => "blob:mock-url";
  globalThis.URL.revokeObjectURL = () => {};
}
