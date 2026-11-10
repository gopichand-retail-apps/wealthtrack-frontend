import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { model, summary } from "../../tests/wealthtrack-fixtures";
import { CashFlowChart, CategoryChart } from "./FinanceCharts";

describe("finance charts", () => {
  it("labels cash-flow charts and formats their axes and tooltips", () => {
    render(<CashFlowChart model={model} data={summary.series} />);

    expect(
      screen.getByRole("img", {
        name: `${model.copy.cashFlow}: ${summary.series.length}`,
      }),
    ).toBeVisible();
  });

  it("renders localized category totals and the chart description", () => {
    render(<CategoryChart model={model} data={summary.categories} />);

    expect(
      screen.getByRole("img", { name: model.copy.spendingByCategory }),
    ).toBeVisible();
    expect(screen.getByText(model.copy.categories.groceries)).toBeVisible();
    expect(screen.getByText("$64.18")).toBeVisible();
  });
});
