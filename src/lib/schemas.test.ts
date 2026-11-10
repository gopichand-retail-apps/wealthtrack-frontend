import { describe, expect, it } from "vitest";
import envelope from "../../public/wealthtrack-model.json";
import {
  copy,
  formatDate,
  formatMoney,
  formatPercent,
  nestedCopy,
} from "./format";
import { contentModelSchema, publicModelSchema } from "./schemas";

describe("WealthTrack content model", () => {
  it("normalizes the strict versioned envelope and removes product-architecture data", () => {
    const model = publicModelSchema.parse(envelope);

    expect(model.modelVersion).toBe(1);
    expect(model.app.locale).toBe("en-US");
    expect(model.copy.overview).toBe("Overview");
    expect(model.navigation).toHaveLength(6);
    expect(model).not.toHaveProperty("architecture");
  });

  it("rejects wrong application IDs, missing data, extra fields, and invalid money", () => {
    expect(
      contentModelSchema.safeParse({ ...envelope, appId: "other-app" }).success,
    ).toBe(false);

    const missingData = structuredClone(envelope);
    Reflect.deleteProperty(missingData, "data");
    expect(contentModelSchema.safeParse(missingData).success).toBe(false);

    expect(
      contentModelSchema.safeParse({
        ...envelope,
        architecture: { diagram: "not product copy" },
      }).success,
    ).toBe(false);

    const invalidAmount = structuredClone(envelope);
    invalidAmount.data.seed.transactions[0].amountCents = 1.5;
    expect(contentModelSchema.safeParse(invalidAmount).success).toBe(false);
  });

  it("requires translated copy and formats integer-cent values", () => {
    const model = publicModelSchema.parse(envelope);

    expect(copy(model, "overview")).toBe("Overview");
    expect(nestedCopy(model, "categories", "groceries")).toBe("Groceries");
    expect(formatMoney(model, -6418)).toBe("-$64.18");
    expect(formatDate(model, "2026-10-31T12:00:00.000Z")).toBe("Oct 31");
    expect(formatPercent(model, 12.5)).toBe("12.5%");
    expect(() => copy(model, "missing")).toThrow(
      "Missing content string: missing",
    );
    expect(() => nestedCopy(model, "categories", "missing")).toThrow(
      "Missing content string: categories.missing",
    );
  });
});
