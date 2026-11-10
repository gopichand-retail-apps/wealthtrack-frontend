import { describe, expect, it } from "vitest";
import { model } from "../../tests/wealthtrack-fixtures";
import {
  copy,
  formatDate,
  formatMoney,
  formatPercent,
  nestedCopy,
} from "./format";

describe("WealthTrack localized copy and display formatting", () => {
  it("reads top-level and nested model copy without fallback text", () => {
    expect(copy(model, "overview")).toBe("Overview");
    expect(nestedCopy(model, "categories", "groceries")).toBe("Groceries");
    expect(() => copy(model, "missing")).toThrow(
      "Missing content string: missing",
    );
    expect(() => nestedCopy(model, "missing", "value")).toThrow(
      "Missing content string: missing.value",
    );

    const invalidModel = structuredClone(model);
    Reflect.set(invalidModel.copy.categories, "groceries", 42);
    expect(() => nestedCopy(invalidModel, "categories", "groceries")).toThrow(
      "Invalid content string: categories.groceries",
    );
  });

  it("formats positive and negative integer cents without float arithmetic", () => {
    expect(formatMoney(model, 240000)).toBe("$2,400.00");
    expect(formatMoney(model, -6418)).toBe("-$64.18");
    expect(formatMoney(model, 0)).toBe("$0.00");
  });

  it("formats dates in the configured locale and timezone", () => {
    expect(formatDate(model, "2026-10-31T12:00:00.000Z")).toBe("Oct 31");
    expect(formatPercent(model, 12.5)).toBe("12.5%");
  });
});
