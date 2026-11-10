import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { budgets, goals, model } from "../../tests/wealthtrack-fixtures";
import { BudgetsView, GoalsView, RecurringView } from "./PlansView";

describe("finance planning views", () => {
  it("shows over-limit and zero-limit budget status safely", () => {
    render(
      <BudgetsView
        model={model}
        budgets={[
          budgets[0],
          { ...budgets[1], limitCents: 0, spentCents: 0, remainingCents: 0 },
        ]}
      />,
    );

    expect(screen.getByText(model.copy.overBudget)).toBeVisible();
    expect(screen.getByText(model.copy.withinBudget)).toBeVisible();
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
  });

  it("caps goal progress at 100 percent", () => {
    render(
      <GoalsView
        model={model}
        goals={[{ ...goals[0], savedCents: goals[0].targetCents + 100 }]}
      />,
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });

  it("shows an empty recurring state when no commitments are due", () => {
    render(<RecurringView model={model} bills={[]} accounts={[]} />);

    expect(screen.getByText(model.copy.noBills)).toBeVisible();
  });
});
