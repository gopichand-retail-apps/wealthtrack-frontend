import { useEffect, useState } from "react";
import {
  ApiError,
  getBills,
  getBudgets,
  getGoals,
  getHealth,
  getSummary,
  getTransactions,
} from "../lib/api";
import { copy } from "../lib/format";
import type {
  AccountSummary,
  Budget,
  FinanceSummary,
  Goal,
  PublicModel,
  RecurringBill,
  Transaction,
} from "../lib/types";

export interface FinanceSnapshot {
  summary: FinanceSummary;
  accounts: AccountSummary[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  bills: RecurringBill[];
}

export interface FinanceQueryResult {
  key: string;
  snapshot?: FinanceSnapshot;
  error?: string;
}

export function useFinanceData(
  model: PublicModel,
  days: number,
  filters: { category?: string; accountId?: string; search?: string },
  revision: number,
) {
  const requestKey = `${days}:${filters.category ?? ""}:${filters.accountId ?? ""}:${filters.search ?? ""}:${revision}`;
  const [result, setResult] = useState<FinanceQueryResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const requestFilters = {
      days,
      category: filters.category,
      accountId: filters.accountId,
      search: filters.search,
    };
    void Promise.all([
      getHealth(model, controller.signal),
      getSummary(model, days, controller.signal),
      getTransactions(model, requestFilters, controller.signal),
      getBudgets(model, controller.signal),
      getGoals(model, controller.signal),
      getBills(model, controller.signal),
    ])
      .then(([, summary, transactions, budgets, goals, bills]) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          snapshot: {
            summary,
            accounts: summary.accounts,
            transactions,
            budgets,
            goals,
            bills,
          },
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          error:
            error instanceof ApiError
              ? error.message
              : copy(model, "serviceUnavailable"),
        });
      });
    return () => controller.abort();
  }, [
    model,
    days,
    filters.category,
    filters.accountId,
    filters.search,
    revision,
    requestKey,
  ]);

  const isCurrent = result?.key === requestKey;
  return {
    snapshot: result?.snapshot ?? null,
    error: isCurrent ? (result?.error ?? null) : null,
    loading: !isCurrent,
  };
}
