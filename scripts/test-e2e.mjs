import process from "node:process";
import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const frontendPort = process.env.WEALTHTRACK_FRONTEND_PORT ?? "5903";
const apiPort = process.env.WEALTHTRACK_API_PORT ?? "5904";
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api/v1`;
const frontendDist =
  process.env.WEALTHTRACK_FRONTEND_DIST_DIR ??
  "node_modules/.cache/wealthtrack-e2e";
const unavailableApiBaseUrl = "http://127.0.0.1:1/api/v1";
const isMock = process.env.VITE_IS_MOCK ?? "true";
const environment = {
  ...process.env,
  WEALTHTRACK_FRONTEND_PORT: frontendPort,
  WEALTHTRACK_API_PORT: apiPort,
  WEALTHTRACK_FRONTEND_DIST_DIR: frontendDist,
  VITE_IS_MOCK: isMock,
  VITE_MOCK_API_BASE_URL:
    process.env.VITE_MOCK_API_BASE_URL ??
    (isMock === "true" ? apiBaseUrl : unavailableApiBaseUrl),
  VITE_REAL_API_BASE_URL:
    process.env.VITE_REAL_API_BASE_URL ??
    (isMock === "false" ? apiBaseUrl : unavailableApiBaseUrl),
};

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
    shell: isWindows,
  });
  if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
    return 1;
  }
  return result.status ?? 1;
}

const packageManager = isWindows ? "npm.cmd" : "npm";
const packageRunner = isWindows ? "npx.cmd" : "npx";
const buildStatus = run(packageManager, [
  "run",
  "build",
  "--",
  "--outDir",
  frontendDist,
]);
process.exitCode =
  buildStatus === 0 ? run(packageRunner, ["playwright", "test"]) : buildStatus;
