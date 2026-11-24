/**
 * Holds the idempotency key for one import the planner has confirmed.
 *
 * The key is created when the planner confirms (not inside the HTTP helper),
 * reused for every retry of the same file, replaced when the file content
 * changes, and discarded once the outcome is known or the import is abandoned.
 * It lives in memory only: nothing is written to browser storage.
 */
export interface ImportIntent {
  keyFor(csvText: string): string;
  discard(): void;
}

export function createImportIntent(
  createKey: () => string = () => crypto.randomUUID(),
): ImportIntent {
  let current: { key: string; csvText: string } | null = null;
  return {
    keyFor(csvText) {
      if (current?.csvText !== csvText) {
        current = { key: createKey(), csvText };
      }
      return current.key;
    },
    discard() {
      current = null;
    },
  };
}
