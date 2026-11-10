import { describe, expect, it, vi } from "vitest";
import {
  accounts,
  bills,
  budgets,
  envelope,
  goals,
  importPreview,
  importResult,
  installApiFetch,
  jsonResponse,
  model,
  summary,
  transactions,
} from "../../tests/wealthtrack-fixtures";
import {
  ApiError,
  commitImport,
  downloadTemplate,
  exportTransactions,
  getAccounts,
  getBills,
  getBudgets,
  getGoals,
  getHealth,
  getSummary,
  getTransactions,
  loadModel,
  previewImport,
} from "./api";

describe("WealthTrack API client", () => {
  it("loads and normalizes the strict content model without caching it", async () => {
    const fetchMock = installApiFetch();

    await expect(loadModel()).resolves.toMatchObject({
      modelVersion: 1,
      app: { locale: "en-US" },
      navigation: expect.not.arrayContaining([
        expect.objectContaining({ id: "architecture" }),
      ]),
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/wealthtrack-model.json");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store" });
  });

  it("rejects unavailable and invalid model responses", async () => {
    installApiFetch({
      "/wealthtrack-model.json": () => new Response("missing", { status: 404 }),
    });
    await expect(loadModel()).rejects.toThrow(
      "Public content model is unavailable.",
    );

    installApiFetch({
      "/wealthtrack-model.json": () => jsonResponse({ version: 1 }),
    });
    await expect(loadModel()).rejects.toThrow(
      "Public content model is invalid.",
    );

    installApiFetch({
      "/wealthtrack-model.json": () =>
        jsonResponse({ ...envelope, appId: "other-app" }),
    });
    await expect(loadModel()).rejects.toThrow(
      "Public content model is invalid.",
    );
  });

  it("validates health and all finance read response shapes", async () => {
    installApiFetch();

    await expect(getHealth(model)).resolves.toMatchObject({ status: "ok" });
    await expect(getSummary(model, 30)).resolves.toEqual(summary);
    await expect(getAccounts(model)).resolves.toEqual(accounts);
    await expect(getTransactions(model, { days: 30 })).resolves.toEqual(
      transactions,
    );
    await expect(getBudgets(model)).resolves.toEqual(budgets);
    await expect(getGoals(model)).resolves.toEqual(goals);
    await expect(getBills(model)).resolves.toEqual(bills);
  });

  it("encodes transaction filters and caps exports at the requested page size", async () => {
    const fetchMock = installApiFetch();
    await getTransactions(model, {
      days: 30,
      category: "groceries & dining",
      accountId: "checking",
      search: "milk & eggs",
      limit: 500,
    });
    await exportTransactions(model, { days: 90, category: "groceries" });

    const transactionUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(transactionUrl.searchParams.get("category")).toBe(
      "groceries & dining",
    );
    expect(transactionUrl.searchParams.get("search")).toBe("milk & eggs");
    expect(
      new URL(String(fetchMock.mock.calls[1]?.[0])).searchParams.get("limit"),
    ).toBe("500");
  });

  it("downloads CSV templates and sends preview/commit requests with idempotency", async () => {
    const fetchMock = installApiFetch();
    await expect(downloadTemplate(model)).resolves.toBeInstanceOf(Response);
    await expect(previewImport(model, "header,row")).resolves.toEqual(
      importPreview,
    );
    await expect(
      commitImport(model, "header,row", "import-123"),
    ).resolves.toEqual(importResult);

    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ csvText: "header,row" }),
    });
    const commitRequest = fetchMock.mock.calls[2]?.[1];
    expect(commitRequest?.headers).toMatchObject({
      "Idempotency-Key": "import-123",
    });
  });

  it("maps stable API codes to model copy and never returns raw backend messages", async () => {
    installApiFetch({
      "/api/v1/summary": () =>
        jsonResponse(
          {
            error: {
              code: "INVALID_PERIOD",
              message: "private database detail",
              requestId: "request-42",
            },
          },
          400,
        ),
    });

    await expect(getSummary(model, 30)).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      code: "INVALID_PERIOD",
      requestId: "test-request-123",
      message: model.copy.errors.invalidRequest,
    });
  });

  it("uses safe generic errors for unknown codes and malformed response bodies", async () => {
    installApiFetch({
      "/api/v1/summary": () =>
        jsonResponse(
          { error: { code: "NEW_BACKEND_CODE", message: "private" } },
          500,
        ),
    });
    await expect(getSummary(model, 30)).rejects.toMatchObject({
      code: "NEW_BACKEND_CODE",
      message: model.copy.errors.server,
    });

    installApiFetch({
      "/api/v1/summary": () => new Response("{", { status: 500 }),
    });
    await expect(getSummary(model, 30)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      message: model.copy.errors.server,
    });

    installApiFetch({
      "/api/v1/summary": () => jsonResponse({ data: { missing: "fields" } }),
    });
    await expect(getSummary(model, 30)).rejects.toBeInstanceOf(ApiError);
  });

  it("maps transport failure to safe copy but preserves request cancellation", async () => {
    installApiFetch({
      "/api/v1/health": () =>
        Promise.reject(new TypeError("private transport detail")),
    });
    await expect(getHealth(model)).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      message: model.copy.serviceUnavailable,
    });

    const controller = new AbortController();
    controller.abort();
    const abortError = new DOMException("Aborted", "AbortError");
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      expect(String(input)).toContain(model.app.apiBaseUrl);
      return Promise.reject(abortError);
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(getHealth(model, controller.signal)).rejects.toBe(abortError);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
