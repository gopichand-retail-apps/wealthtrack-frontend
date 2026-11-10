import { z } from "zod";
import { resolveApiBaseUrl } from "../config";
import { publicModelSchema } from "./schemas";
import { copy, nestedCopy } from "./format";
import {
  accountListSchema,
  billListSchema,
  budgetListSchema,
  financeSummarySchema,
  goalListSchema,
  healthSchema,
  importPreviewSchema,
  importResultSchema,
  transactionListSchema,
} from "./schemas";
import type { PublicModel } from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;

  constructor(
    message: string,
    status: number,
    code: string,
    requestId: string | null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

const errorCopyByCode: Readonly<Record<string, string>> = {
  INVALID_PERIOD: "invalidRequest",
  INVALID_FILTER: "invalidRequest",
  INVALID_CATEGORY: "invalidRequest",
  INVALID_IMPORT_REQUEST: "invalidRequest",
  IDEMPOTENCY_KEY_REQUIRED: "invalidRequest",
  INVALID_JSON: "invalidRequest",
  INVALID_CSV: "invalidCsv",
  PAYLOAD_TOO_LARGE: "payloadTooLarge",
  ORIGIN_NOT_ALLOWED: "originNotAllowed",
  ACCOUNT_NOT_FOUND: "notFound",
  NOT_FOUND: "notFound",
  RATE_LIMITED: "rateLimited",
  INTERNAL_ERROR: "server",
};

function getErrorMessage(model: PublicModel, code: string): string {
  return nestedCopy(model, "errors", errorCopyByCode[code] ?? "server");
}

type RequestOptions = {
  signal?: AbortSignal;
  method?: string;
  body?: string;
  headers?: HeadersInit;
};

async function sendRequest(
  model: PublicModel,
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  try {
    return await fetch(`${model.app.apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      signal: options.signal,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      body: options.body,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      copy(model, "serviceUnavailable"),
      0,
      "SERVICE_UNAVAILABLE",
      null,
    );
  }
}

export async function loadModel(signal?: AbortSignal): Promise<PublicModel> {
  const response = await fetch("/wealthtrack-model.json", {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("Public content model is unavailable.");
  const payload: unknown = await response.json();
  const parsed = publicModelSchema.safeParse(payload);
  if (!parsed.success) throw new Error("Public content model is invalid.");
  return {
    ...parsed.data,
    app: {
      ...parsed.data.app,
      apiBaseUrl: resolveApiBaseUrl(parsed.data.app.apiBaseUrl),
    },
  };
}

async function requestData<T>(
  model: PublicModel,
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const response = await sendRequest(model, path, options);
  const requestId = response.headers.get("x-request-id");
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      nestedCopy(model, "errors", "server"),
      response.status,
      "INVALID_RESPONSE",
      requestId,
    );
  }
  if (!response.ok) {
    const parsedError = z
      .object({ error: z.object({ code: z.string().min(1) }) })
      .safeParse(payload);
    const errorCode = parsedError.success
      ? parsedError.data.error.code
      : "REQUEST_FAILED";
    throw new ApiError(
      getErrorMessage(model, errorCode),
      response.status,
      errorCode,
      requestId,
    );
  }
  const data =
    typeof payload === "object" && payload !== null && "data" in payload
      ? payload.data
      : undefined;
  const parsed = schema.safeParse(data);
  if (!parsed.success)
    throw new ApiError(
      nestedCopy(model, "errors", "server"),
      response.status,
      "INVALID_RESPONSE",
      requestId,
    );
  return parsed.data;
}

function query(filters: {
  days?: number;
  category?: string;
  accountId?: string;
  search?: string;
  limit?: number;
}) {
  const parameters = new URLSearchParams();
  if (filters.days) parameters.set("days", String(filters.days));
  if (filters.category) parameters.set("category", filters.category);
  if (filters.accountId) parameters.set("accountId", filters.accountId);
  if (filters.search) parameters.set("search", filters.search);
  if (filters.limit) parameters.set("limit", String(filters.limit));
  const value = parameters.toString();
  return value ? `?${value}` : "";
}

export function getHealth(model: PublicModel, signal?: AbortSignal) {
  return requestData(model, "/health", healthSchema, { signal });
}

export function getSummary(
  model: PublicModel,
  days: number,
  signal?: AbortSignal,
) {
  return requestData(
    model,
    `/summary${query({ days })}`,
    financeSummarySchema,
    { signal },
  );
}

export function getAccounts(model: PublicModel, signal?: AbortSignal) {
  return requestData(model, "/accounts", accountListSchema, { signal });
}

export function getTransactions(
  model: PublicModel,
  filters: {
    days?: number;
    category?: string;
    accountId?: string;
    search?: string;
    limit?: number;
  },
  signal?: AbortSignal,
) {
  return requestData(
    model,
    `/transactions${query(filters)}`,
    transactionListSchema,
    { signal },
  );
}

export function getBudgets(model: PublicModel, signal?: AbortSignal) {
  return requestData(model, "/budgets", budgetListSchema, { signal });
}

export function getGoals(model: PublicModel, signal?: AbortSignal) {
  return requestData(model, "/goals", goalListSchema, { signal });
}

export function getBills(model: PublicModel, signal?: AbortSignal) {
  return requestData(model, "/bills", billListSchema, { signal });
}

export function downloadTemplate(model: PublicModel) {
  return sendRequest(model, "/imports/template");
}

export function previewImport(model: PublicModel, csvText: string) {
  return requestData(model, "/imports/preview", importPreviewSchema, {
    method: "POST",
    body: JSON.stringify({ csvText }),
  });
}

export function commitImport(
  model: PublicModel,
  csvText: string,
  idempotencyKey: string,
) {
  return requestData(model, "/imports", importResultSchema, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ csvText }),
  });
}

export function exportTransactions(
  model: PublicModel,
  filters: { days?: number; category?: string; accountId?: string },
) {
  return sendRequest(
    model,
    `/transactions${query({ ...filters, limit: 500 })}`,
  );
}
