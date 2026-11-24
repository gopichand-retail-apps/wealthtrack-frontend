import { describe, expect, it } from "vitest";
import { createImportIntent } from "./importIntent";

function keySequence() {
  let count = 0;
  return () => `key-${++count}`;
}

describe("import intent key", () => {
  it("creates a key when first asked and reuses it while the file is unchanged", () => {
    const intent = createImportIntent(keySequence());

    expect(intent.keyFor("file-a")).toBe("key-1");
    expect(intent.keyFor("file-a")).toBe("key-1");
    expect(intent.keyFor("file-a")).toBe("key-1");
  });

  it("replaces the key when the file content changes", () => {
    const intent = createImportIntent(keySequence());

    expect(intent.keyFor("file-a")).toBe("key-1");
    expect(intent.keyFor("file-b")).toBe("key-2");
    expect(intent.keyFor("file-b")).toBe("key-2");
  });

  it("creates a fresh key after the intent is discarded, even for the same file", () => {
    const intent = createImportIntent(keySequence());

    expect(intent.keyFor("file-a")).toBe("key-1");
    intent.discard();
    expect(intent.keyFor("file-a")).toBe("key-2");
  });

  it("uses a random UUID by default and keeps it only in memory", () => {
    const first = createImportIntent().keyFor("file-a");
    const second = createImportIntent().keyFor("file-a");

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/);
    expect(second).not.toBe(first);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
