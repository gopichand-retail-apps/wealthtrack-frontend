import { ArrowUpRight, CalendarClock, Flag } from "lucide-react";
import { copy, formatDate, formatMoney, nestedCopy } from "../lib/format";
import type { Budget, Goal, PublicModel, RecurringBill } from "../lib/types";

export function BudgetsView({
  model,
  budgets,
}: {
  model: PublicModel;
  budgets: Budget[];
}) {
  return (
    <div className="budget-grid">
      {budgets.map((budget) => {
        const percent =
          budget.limitCents > 0
            ? Math.min(
                100,
                Math.round((budget.spentCents / budget.limitCents) * 100),
              )
            : 0;
        const over = budget.remainingCents < 0;
        return (
          <article className="panel budget-card" key={budget.id}>
            <div className="budget-card-heading">
              <span
                className="category-dot"
                style={{
                  backgroundColor: model.categories.find(
                    (category) => category.id === budget.categoryId,
                  )?.color,
                }}
                aria-hidden="true"
              />
              <h2>{nestedCopy(model, "categories", budget.categoryId)}</h2>
              <span
                className={over ? "budget-status is-over" : "budget-status"}
              >
                {copy(model, over ? "overBudget" : "withinBudget")}
              </span>
            </div>
            <strong className="budget-spent">
              {formatMoney(model, budget.spentCents)}
            </strong>
            <div
              className="budget-progress"
              role="progressbar"
              aria-label={[
                nestedCopy(model, "categories", budget.categoryId),
                copy(model, "budgetLimit"),
              ].join(" ")}
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                className={over ? "is-over" : ""}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="budget-footer">
              <span>
                {copy(model, "budgetLimit")}{" "}
                {formatMoney(model, budget.limitCents)}
              </span>
              <span>
                {copy(model, "remaining")}{" "}
                {formatMoney(model, budget.remainingCents)}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function GoalsView({
  model,
  goals,
}: {
  model: PublicModel;
  goals: Goal[];
}) {
  return (
    <div className="goal-grid">
      {goals.map((goal) => {
        const percent = Math.min(
          100,
          Math.round((goal.savedCents / goal.targetCents) * 100),
        );
        return (
          <article className="panel goal-card" key={goal.id}>
            <span className="goal-icon">
              <Flag size={17} aria-hidden="true" />
            </span>
            <h2>{goal.name}</h2>
            <strong>{formatMoney(model, goal.savedCents)}</strong>
            <div
              className="goal-progress"
              role="progressbar"
              aria-label={`${goal.name} ${copy(model, "goalProgress")}`}
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
            <div className="goal-footer">
              <span>
                {copy(model, "goalTarget")}{" "}
                {formatMoney(model, goal.targetCents)}
              </span>
              <span>
                {copy(model, "goalDeadline")}{" "}
                {formatDate(model, goal.targetDate)}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function RecurringView({
  model,
  bills,
  accounts,
}: {
  model: PublicModel;
  bills: RecurringBill[];
  accounts: Array<{ id: string; name: string }>;
}) {
  const accountNames = new Map(
    accounts.map((account) => [account.id, account.name]),
  );
  return (
    <section className="panel data-panel full-panel">
      <div className="panel-heading-row">
        <div>
          <h2>{copy(model, "recurring")}</h2>
          <p>{copy(model, "recurringDescription")}</p>
        </div>
        <CalendarClock size={18} aria-hidden="true" />
      </div>
      <div className="recurring-list">
        {bills.map((bill) => (
          <article className="recurring-row" key={bill.id}>
            <span className="recurring-icon">
              <CalendarClock size={16} aria-hidden="true" />
            </span>
            <span className="recurring-name">
              <strong>{bill.name}</strong>
              <small>
                {nestedCopy(model, "categories", bill.categoryId)} ·{" "}
                {accountNames.get(bill.accountId) ?? bill.accountId}
              </small>
            </span>
            <span className="recurring-date">
              <small>{copy(model, "nextCharge")}</small>
              <strong>{formatDate(model, bill.nextDue)}</strong>
            </span>
            <span className="recurring-amount">
              <strong>{formatMoney(model, bill.amountCents)}</strong>
              <small>{copy(model, bill.cadence)}</small>
            </span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </article>
        ))}
      </div>
      {!bills.length ? (
        <p className="empty-state">{copy(model, "noBills")}</p>
      ) : null}
    </section>
  );
}
