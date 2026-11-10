import { describe, expect, it } from "vitest";
import { model, transactions } from "../../tests/wealthtrack-fixtures";
import { createTransactionsCsv } from "./csv";

describe("WealthTrack CSV export", () => {
  it("preserves exact signed cents and quotes ordinary catalog values", () => {
    const market = transactions.find(
      (transaction) => transaction.description === "Market groceries",
    );
    const paycheck = transactions.find(
      (transaction) => transaction.description === "Payroll deposit",
    );
    if (!market || !paycheck)
      throw new Error("Expected synthetic market and payroll transactions.");
    const csv = createTransactionsCsv(model, [market, paycheck]);

    expect(csv.split("\r\n")[0]).toBe(
      '"date","description","category","account","amount","currency"',
    );
    expect(csv).toContain('"Market groceries"');
    expect(csv).toContain('"-64.18"');
    expect(csv).toContain('"2400.00"');
  });

  it("neutralizes formula-like and control-prefixed text and escapes quotes", () => {
    const transaction = {
      ...transactions[0],
      description: ' =HYPERLINK("https://example.invalid","Open")',
      accountId: "removed-account",
      amountCents: -1234,
    };
    const csv = createTransactionsCsv(model, [transaction]);

    expect(csv).toContain(
      `"' =HYPERLINK(""https://example.invalid"",""Open"")"`,
    );
    expect(csv).toContain('"removed-account"');
    expect(csv).toContain('"-12.34"');

    const controlText = createTransactionsCsv(model, [
      { ...transaction, description: "\u0001unsafe" },
    ]);
    expect(controlText).toContain(`"'\u0001unsafe"`);
  });

  it("exports the configured header even when there are no rows", () => {
    expect(createTransactionsCsv(model, [])).toBe(
      '"date","description","category","account","amount","currency"',
    );
  });
});
