import { ApiError } from "./api";
import type { ImportIssue, ImportResult } from "./types";

/** What the planner sees after confirming, or after a preview needs fixing. */
export type ImportOutcome =
  | { kind: "committed"; result: ImportResult }
  | { kind: "replayed"; result: ImportResult }
  | { kind: "awaiting" }
  | { kind: "rejected"; message: string }
  | { kind: "conflict"; message: string }
  | { kind: "needsCorrection"; issues: ImportIssue[] };

export interface CommitFailure {
  outcome: ImportOutcome;
  /** True when the intent is settled and the next attempt needs a new key. */
  discardKey: boolean;
}

/**
 * Sorts a failed commit into "may have been saved" or a definite answer.
 * A lost connection, a server error or an unreadable reply leave the import
 * unconfirmed, so the same key must be retried. A definite refusal never
 * saved anything.
 */
export function classifyCommitFailure(error: unknown): CommitFailure {
  if (!(error instanceof ApiError) || isUnconfirmed(error)) {
    return { outcome: { kind: "awaiting" }, discardKey: false };
  }
  if (error.code === "IDEMPOTENCY_KEY_REUSED") {
    return {
      outcome: { kind: "conflict", message: error.message },
      discardKey: true,
    };
  }
  if (error.code === "INVALID_CSV") {
    return {
      outcome: { kind: "needsCorrection", issues: error.details },
      discardKey: true,
    };
  }
  return {
    outcome: { kind: "rejected", message: error.message },
    discardKey: false,
  };
}

function isUnconfirmed(error: ApiError): boolean {
  return (
    error.status === 0 ||
    error.status >= 500 ||
    error.code === "INVALID_RESPONSE"
  );
}
