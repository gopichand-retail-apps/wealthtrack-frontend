import {
  ArrowDownRight,
  CircleDollarSign,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { CashFlowChart, CategoryChart } from "./FinanceCharts";
import { copy, formatMoney, formatPercent } from "../lib/format";
import type { FinanceSummary, PublicModel } from "../lib/types";

export function OverviewView({
  model,
  summary,
}: {
  model: PublicModel;
  summary: FinanceSummary;
}) {
  return (
    <div className="view-stack">
      <section className="metric-grid" aria-label={copy(model, "overview")}>
        <MetricCard
          model={model}
          label="cashPosition"
          value={formatMoney(model, summary.cashPositionCents)}
          icon={Wallet}
          tone="green"
        />
        <MetricCard
          model={model}
          label="income"
          value={formatMoney(model, summary.incomeCents)}
          icon={ArrowDownRight}
          tone="blue"
        />
        <MetricCard
          model={model}
          label="spending"
          value={formatMoney(model, summary.spendingCents)}
          icon={ReceiptText}
          tone="coral"
        />
        <MetricCard
          model={model}
          label="netCashFlow"
          value={formatMoney(model, summary.netCashFlowCents)}
          icon={CircleDollarSign}
          tone="gold"
        />
      </section>
      <div className="analytics-grid">
        <section className="panel chart-panel">
          <div className="panel-heading-row">
            <div>
              <h2>{copy(model, "cashFlow")}</h2>
              <p>{copy(model, "monthToDate")}</p>
            </div>
            <span
              className={
                summary.netCashFlowCents >= 0
                  ? "change-pill is-positive"
                  : "change-pill is-negative"
              }
            >
              {formatPercent(model, summary.savingsRatePct)}
            </span>
          </div>
          <CashFlowChart model={model} data={summary.series} />
        </section>
        <section className="panel chart-panel category-panel">
          <h2>{copy(model, "spendingByCategory")}</h2>
          <CategoryChart model={model} data={summary.categories} />
        </section>
      </div>
      <section className="panel account-panel">
        <div className="panel-heading-row">
          <div>
            <h2>{copy(model, "accountBalances")}</h2>
            <p>{copy(model, "storageDescription")}</p>
          </div>
        </div>
        <div className="account-grid">
          {summary.accounts.map((account) => (
            <article className="account-tile" key={account.id}>
              <span className="account-type">{account.type}</span>
              <strong>{account.name}</strong>
              <span className="account-balance">
                {formatMoney(model, account.balanceCents)}
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  model,
  label,
  value,
  icon: Icon,
  tone,
}: {
  model: PublicModel;
  label: string;
  value: string;
  icon: typeof Wallet;
  tone: "green" | "blue" | "coral" | "gold";
}) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-topline">
        <span>{copy(model, label)}</span>
        <span className="metric-icon">
          <Icon size={17} aria-hidden="true" />
        </span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-caption">{copy(model, "monthToDate")}</span>
    </article>
  );
}
