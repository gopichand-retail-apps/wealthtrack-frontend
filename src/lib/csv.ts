import { nestedCopy } from "./format";
import type { PublicModel, Transaction } from "./types";

const formulaLikePrefix = /^[\s\uFEFF]*[=+\-@]/u;

function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const value = Math.abs(cents);
  const whole = Math.floor(value / 100);
  const fraction = String(value % 100).padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}

function quoteCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function csvTextCell(value: string): string {
  const startsWithControl =
    value.charCodeAt(0) < 0x20 || value.startsWith("\uFEFF");
  const safe =
    startsWithControl || formulaLikePrefix.test(value) ? `'${value}` : value;
  return quoteCsvCell(safe);
}

function csvAmountCell(cents: number): string {
  return quoteCsvCell(formatCents(cents));
}

export function createTransactionsCsv(
  model: PublicModel,
  transactions: Transaction[],
): string {
  const rows = transactions.map((transaction) => {
    const account = model.seed.accounts.find(
      (item) => item.id === transaction.accountId,
    );
    return [
      csvTextCell(transaction.date.slice(0, 10)),
      csvTextCell(transaction.description),
      csvTextCell(nestedCopy(model, "categories", transaction.category)),
      csvTextCell(account?.name ?? transaction.accountId),
      csvAmountCell(transaction.amountCents),
      csvTextCell(transaction.currency),
    ];
  });
  return [
    model.csv.headers.map(csvTextCell).join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\r\n");
}
