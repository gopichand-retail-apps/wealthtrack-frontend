import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  installApiFetch,
  jsonResponse,
  model,
} from "../../tests/wealthtrack-fixtures";
import { useFinanceData } from "./FinanceData";

describe("finance data query hook", () => {
  it("loads a complete snapshot and starts in a loading state", async () => {
    installApiFetch();
    const { result } = renderHook(() => useFinanceData(model, 30, {}, 0));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.snapshot).not.toBeNull());
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("reports safe API errors and keeps a changing filter key loading until refreshed", async () => {
    const fetchMock = installApiFetch({
      "/api/v1/summary": () =>
        jsonResponse(
          { error: { code: "INTERNAL_ERROR", message: "private" } },
          500,
        ),
    });
    const { result, rerender } = renderHook(
      ({ days }) => useFinanceData(model, days, {}, 0),
      { initialProps: { days: 30 } },
    );

    await waitFor(() =>
      expect(result.current.error).toBe(model.copy.errors.server),
    );
    rerender({ days: 7 });
    expect(result.current.loading).toBe(true);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(6);
  });

  it("ignores an aborted request after the view unmounts", async () => {
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = renderHook(() => useFinanceData(model, 30, {}, 0));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    await act(async () => unmount());
  });
});
