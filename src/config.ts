const defaultIsMock = true;
const modeOverride = import.meta.env.VITE_IS_MOCK;

if (
  modeOverride !== undefined &&
  modeOverride !== "true" &&
  modeOverride !== "false"
) {
  throw new Error('VITE_IS_MOCK must be "true" or "false".');
}

export const isMock =
  modeOverride === undefined ? defaultIsMock : modeOverride === "true";

interface ApiModeEnvironment {
  DEV: boolean;
  VITE_MOCK_API_BASE_URL?: string;
  VITE_REAL_API_BASE_URL?: string;
}

export function resolveApiBaseUrl(
  mockApiBaseUrl: string,
  environment: ApiModeEnvironment = import.meta.env,
): string {
  const localMockApiBaseUrl = environment.DEV
    ? mockApiBaseUrl.trim()
    : undefined;
  const selectedBaseUrl = isMock
    ? environment.VITE_MOCK_API_BASE_URL?.trim() || localMockApiBaseUrl
    : environment.VITE_REAL_API_BASE_URL?.trim();
  if (!selectedBaseUrl) {
    throw new Error(
      isMock
        ? environment.DEV
          ? "A local mock API base URL is required when VITE_IS_MOCK=true."
          : "VITE_MOCK_API_BASE_URL is required in production when VITE_IS_MOCK=true."
        : "VITE_REAL_API_BASE_URL is required when VITE_IS_MOCK=false.",
    );
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(selectedBaseUrl);
  } catch {
    throw new Error(
      "The selected API base URL must be an absolute HTTP(S) URL.",
    );
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("The selected API base URL must use HTTP or HTTPS.");
  }
  return parsedUrl.toString().replace(/\/+$/, "");
}
