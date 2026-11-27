import { describe, expect, it } from "vitest";
import { ApiError, ImportRowsError } from "./api";
import { classifyCommitFailure } from "./importOutcome";

const issues = [{ rowNumber: 3, code: "invalidDate" }];

describe("commit failure classification", () => {
  it.each([
    [
      "a transport failure",
      new ApiError("down", 0, "SERVICE_UNAVAILABLE", null),
    ],
    ["a server error", new ApiError("oops", 503, "INTERNAL_ERROR", "r-1")],
    [
      "an unreadable reply",
      new ApiError("bad", 201, "INVALID_RESPONSE", "r-2"),
    ],
    ["an unexpected throw", new TypeError("boom")],
  ])("treats %s as unconfirmed and keeps the key", (_name, error) => {
    expect(classifyCommitFailure(error)).toEqual({
      outcome: { kind: "awaiting" },
      discardKey: false,
    });
  });

  it("treats a reused key as a conflict and discards the key", () => {
    const error = new ApiError("reused", 409, "IDEMPOTENCY_KEY_REUSED", "r-3");

    expect(classifyCommitFailure(error)).toEqual({
      outcome: { kind: "conflict", message: "reused" },
      discardKey: true,
    });
  });

  it("treats rejected rows as needing correction and discards the key", () => {
    const error = new ImportRowsError(
      new ApiError("invalid", 422, "INVALID_CSV", "r-4"),
      issues,
    );

    expect(classifyCommitFailure(error)).toEqual({
      outcome: { kind: "needsCorrection", issues },
      discardKey: true,
    });
  });

  it("keeps the key when the server refused the request without saving", () => {
    const error = new ApiError("slow down", 429, "RATE_LIMITED", "r-5");

    expect(classifyCommitFailure(error)).toEqual({
      outcome: { kind: "rejected", message: "slow down" },
      discardKey: false,
    });
  });
});
