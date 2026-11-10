import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { model, summary } from "../../tests/wealthtrack-fixtures";
import { OverviewView } from "./OverviewView";

describe("finance overview", () => {
  it("marks a negative net cash flow distinctly", () => {
    render(
      <OverviewView
        model={model}
        summary={{ ...summary, netCashFlowCents: -100, savingsRatePct: -2.5 }}
      />,
    );

    expect(screen.getByText("-$1.00")).toBeVisible();
    expect(document.querySelector(".change-pill")).toHaveClass("is-negative");
  });
});
