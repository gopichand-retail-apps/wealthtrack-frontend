import { defineConfig, devices } from "@playwright/test";

const isContinuousIntegration = Boolean(process.env.CI);
const frontendPort = Number(process.env.WEALTHTRACK_FRONTEND_PORT ?? 5903);
const apiPort = Number(process.env.WEALTHTRACK_API_PORT ?? 5904);
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const apiUrl = `http://127.0.0.1:${apiPort}`;
const frontendDist =
  process.env.WEALTHTRACK_FRONTEND_DIST_DIR ??
  "node_modules/.cache/wealthtrack-e2e";

export default defineConfig({
  testDir: "./e2e",
  timeout: 10_000,
  fullyParallel: false,
  forbidOnly: isContinuousIntegration,
  retries: isContinuousIntegration ? 1 : 0,
  workers: 1,
  reporter: "list",
  expect: { timeout: 3_000 },
  use: {
    baseURL: frontendUrl,
    actionTimeout: 3_000,
    navigationTimeout: 5_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node src/main.mjs",
      cwd: "../wealthtrack-backend",
      url: `${apiUrl}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 20_000,
      env: {
        PORT: String(apiPort),
        WEALTHTRACK_DB_PATH: ":memory:",
        WEALTHTRACK_ALLOWED_ORIGINS: frontendUrl,
        WEALTHTRACK_E2E_RATE_LIMIT: "1000",
      },
    },
    {
      command: `npx vite preview --host 127.0.0.1 --port ${frontendPort} --strictPort --outDir ${frontendDist}`,
      url: frontendUrl,
      reuseExistingServer: false,
      timeout: 20_000,
    },
  ],
});
