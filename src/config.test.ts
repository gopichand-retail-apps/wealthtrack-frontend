import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("API mode configuration", () => {
  it("defaults to the local mock API in development", async () => {
    vi.stubEnv("VITE_IS_MOCK", "true");
    const config = await import("./config");

    expect(config.isMock).toBe(true);
    expect(config.resolveApiBaseUrl("http://127.0.0.1:5902/api/v1")).toBe(
      "http://127.0.0.1:5902/api/v1",
    );
    expect(() =>
      config.resolveApiBaseUrl("http://127.0.0.1:5902/api/v1", {
        DEV: false,
        VITE_MOCK_API_BASE_URL: "",
      }),
    ).toThrow(
      "VITE_MOCK_API_BASE_URL is required in production when VITE_IS_MOCK=true.",
    );
    expect(
      config.resolveApiBaseUrl("http://127.0.0.1:5902/api/v1", {
        DEV: false,
        VITE_MOCK_API_BASE_URL: "https://mock.example.com/api/v1/",
      }),
    ).toBe("https://mock.example.com/api/v1");
  });

  it("uses an explicitly configured real API and fails closed when absent", async () => {
    vi.stubEnv("VITE_IS_MOCK", "false");
    vi.stubEnv("VITE_REAL_API_BASE_URL", "https://api.example.com/api/v1");
    const config = await import("./config");

    expect(config.isMock).toBe(false);
    expect(config.resolveApiBaseUrl("http://127.0.0.1:5902/api/v1")).toBe(
      "https://api.example.com/api/v1",
    );

    vi.stubEnv("VITE_REAL_API_BASE_URL", "");
    expect(() =>
      config.resolveApiBaseUrl("http://127.0.0.1:5902/api/v1"),
    ).toThrow("VITE_REAL_API_BASE_URL is required when VITE_IS_MOCK=false.");
  });

  it("rejects invalid mode values and unsupported protocols", async () => {
    vi.stubEnv("VITE_IS_MOCK", "maybe");
    vi.resetModules();
    await expect(import("./config")).rejects.toThrow(
      'VITE_IS_MOCK must be "true" or "false".',
    );

    vi.stubEnv("VITE_IS_MOCK", "false");
    vi.stubEnv("VITE_REAL_API_BASE_URL", "file:///tmp/wealthtrack-api");
    vi.resetModules();
    const config = await import("./config");
    expect(() =>
      config.resolveApiBaseUrl("http://127.0.0.1:5902/api/v1"),
    ).toThrow("The selected API base URL must use HTTP or HTTPS.");
  });
});
