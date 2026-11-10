import modelEnvelope from "../public/wealthtrack-model.json";
import { publicModelSchema } from "../src/lib/schemas";
import type {
  AccountSummary,
  Budget,
  FinanceSummary,
  Goal,
  ImportPreview,
  ImportResult,
  PublicModel,
  RecurringBill,
  Transaction,
} from "../src/lib/types";
import { vi } from "vitest";

export const envelope = structuredClone(modelEnvelope);
export const model: PublicModel = publicModelSchema.parse(envelope);
const fixtureNow = Date.UTC(2026, 9, 31, 12);

export const accounts: AccountSummary[] = model.seed.accounts.map(
  (account) => ({
    ...account,
    balanceCents: account.openingBalanceCents,
  }),
);

export const transactions: Transaction[] = model.seed.transactions.map(
  (item) => ({
    id: item.id,
    date: new Date(fixtureNow - item.daysAgo * 86_400_000).toISOString(),
    description: item.description,
    category: item.category,
    accountId: item.accountId,
    amountCents: item.amountCents,
    currency: item.currency,
    source: "seed",
  }),
);

export const summary: FinanceSummary = {
  periodDays: 30,
  cashPositionCents: accounts.reduce(
    (total, account) => total + account.balanceCents,
    0,
  ),
  incomeCents: 240000,
  spendingCents: 80000,
  netCashFlowCents: 160000,
  savingsRatePct: 66.7,
  accounts,
  series: [
    { date: "2026-10-30", amountCents: -6418 },
    { date: "2026-10-31", amountCents: 240000 },
  ],
  categories: [
    { id: "groceries", amountCents: 6418 },
    { id: "dining", amountCents: 1840 },
  ],
  transactions: transactions.slice(0, 6),
};

export const budgets: Budget[] = model.seed.budgets.map((budget) => {
  const spentCents =
    budget.categoryId === "housing" ? budget.limitCents + 100 : 6400;
  return {
    id: budget.id,
    categoryId: budget.categoryId,
    limitCents: budget.limitCents,
    spentCents,
    remainingCents: budget.limitCents - spentCents,
  };
});

export const goals: Goal[] = model.seed.goals.map((goal) => ({
  id: goal.id,
  name: goal.name,
  savedCents: goal.savedCents,
  targetCents: goal.targetCents,
  targetDate: goal.targetDate,
}));

export const bills: RecurringBill[] = model.seed.bills.map((bill) => ({
  id: bill.id,
  name: bill.name,
  categoryId: bill.categoryId,
  amountCents: bill.amountCents,
  accountId: bill.accountId,
  cadence: bill.cadence,
  nextDue: new Date(fixtureNow + bill.dueInDays * 86_400_000).toISOString(),
}));

export const importPreview: ImportPreview = {
  validRows: [
    {
      date: "2026-10-31",
      description: "Market groceries",
      category: "groceries",
      accountId: "checking",
      amountCents: -6418,
      currency: "USD",
    },
  ],
  invalidRows: [],
  validCount: 1,
  invalidCount: 0,
  netAmountCents: -6418,
};

export const importResult: ImportResult = {
  idempotencyKey: "test-import-key",
  importedAt: "2026-10-31T12:00:00.000Z",
  rowsAdded: 1,
  totalNetCents: -6418,
  replayed: false,
};

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": "test-request-123",
    },
  });
}

export function pathnameOf(input: RequestInfo | URL): string {
  if (input instanceof URL) return input.pathname;
  return new URL(
    typeof input === "string" ? input : input.url,
    "http://localhost",
  ).pathname;
}

export function responseForPath(path: string): Response {
  if (path === "/wealthtrack-model.json") return jsonResponse(envelope);
  if (path === "/api/v1/health") {
    return jsonResponse({
      data: { status: "ok", service: "wealthtrack-api", storage: "sqlite" },
    });
  }
  if (path === "/api/v1/summary") return jsonResponse({ data: summary });
  if (path === "/api/v1/accounts") return jsonResponse({ data: accounts });
  if (path.startsWith("/api/v1/transactions"))
    return jsonResponse({ data: transactions });
  if (path === "/api/v1/budgets") return jsonResponse({ data: budgets });
  if (path === "/api/v1/goals") return jsonResponse({ data: goals });
  if (path === "/api/v1/bills") return jsonResponse({ data: bills });
  if (path === "/api/v1/imports/template") {
    return new Response(model.csv.headers.join(",") + "\n", {
      headers: { "Content-Type": "text/csv" },
    });
  }
  if (path === "/api/v1/imports/preview") {
    return jsonResponse({ data: importPreview });
  }
  if (path === "/api/v1/imports")
    return jsonResponse({ data: importResult }, 201);
  return jsonResponse({ error: { code: "NOT_FOUND" } }, 404);
}

export function installApiFetch(
  overrides: Partial<
    Record<
      string,
      (
        input: RequestInfo | URL,
        init?: RequestInit,
      ) => Response | Promise<Response>
    >
  > = {},
) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = pathnameOf(input);
    return overrides[path]?.(input, init) ?? responseForPath(path);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
