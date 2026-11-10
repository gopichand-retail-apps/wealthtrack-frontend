import type { z } from "zod";
import { publicModelSchema } from "./schemas";

export type PublicModel = z.infer<typeof publicModelSchema>;
export type WorkspaceView = PublicModel["navigation"][number]["id"];
export type ThemeMode = "light" | "dark";

export interface AccountSummary {
  id: string;
  name: string;
  type: string;
  currency: string;
  openingBalanceCents: number;
  balanceCents: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  accountId: string;
  amountCents: number;
  currency: string;
  source: string;
}

export interface CashFlowPoint {
  date: string;
  amountCents: number;
}

export interface CategorySpending {
  id: string;
  amountCents: number;
}

export interface FinanceSummary {
  periodDays: number;
  cashPositionCents: number;
  incomeCents: number;
  spendingCents: number;
  netCashFlowCents: number;
  savingsRatePct: number;
  accounts: AccountSummary[];
  series: CashFlowPoint[];
  categories: CategorySpending[];
  transactions: Transaction[];
}

export interface Budget {
  id: string;
  categoryId: string;
  limitCents: number;
  spentCents: number;
  remainingCents: number;
}

export interface Goal {
  id: string;
  name: string;
  savedCents: number;
  targetCents: number;
  targetDate: string;
}

export interface RecurringBill {
  id: string;
  name: string;
  categoryId: string;
  amountCents: number;
  accountId: string;
  cadence: string;
  nextDue: string;
}

export interface ImportIssue {
  rowNumber: number;
  code: string;
}

export interface ImportPreview {
  validRows: ImportPreviewRow[];
  invalidRows: ImportIssue[];
  validCount: number;
  invalidCount: number;
  netAmountCents: number;
}

export interface ImportPreviewRow {
  date: string;
  description: string;
  category: string;
  accountId: string;
  amountCents: number;
  currency: string;
}

export interface ImportResult {
  idempotencyKey: string;
  importedAt: string;
  rowsAdded: number;
  totalNetCents: number;
  replayed: boolean;
}
