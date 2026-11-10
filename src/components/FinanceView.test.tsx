import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  accounts,
  bills,
  budgets,
  goals,
  model,
  summary,
  transactions,
} from "../../tests/wealthtrack-fixtures";
import type { FinanceSnapshot } from "./FinanceData";
import { FinanceView } from "./FinanceView";

const snapshot: FinanceSnapshot = {
  summary,
  accounts,
  transactions,
  budgets,
  goals,
  bills,
};

function viewProps(
  overrides: Partial<React.ComponentProps<typeof FinanceView>> = {},
) {
  return {
    model,
    view: "overview" as const,
    snapshot,
    loading: false,
    error: null,
    search: "",
    category: "",
    accountId: "",
    onSearch: vi.fn(),
    onCategory: vi.fn(),
    onAccount: vi.fn(),
    onRetry: vi.fn(),
    onImportComplete: vi.fn(),
    ...overrides,
  };
}

describe("finance view states and routing", () => {
  it("renders a loading status until the first snapshot arrives", () => {
    render(<FinanceView {...viewProps({ snapshot: null })} />);

    expect(screen.getByRole("status")).toHaveTextContent(model.copy.loading);
  });

  it("renders safe recovery and invokes retry on an initial error", () => {
    const onRetry = vi.fn();
    render(
      <FinanceView
        {...viewProps({
          snapshot: null,
          error: model.copy.errors.server,
          onRetry,
        })}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      model.copy.errors.server,
    );
    fireEvent.click(screen.getByRole("button", { name: model.copy.retry }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("routes to every customer-facing finance view", () => {
    const { rerender } = render(<FinanceView {...viewProps()} />);
    expect(screen.getByRole("img", { name: /Cash flow:/ })).toBeVisible();

    rerender(<FinanceView {...viewProps({ view: "transactions" })} />);
    expect(screen.getByRole("table")).toBeVisible();

    rerender(<FinanceView {...viewProps({ view: "budgets" })} />);
    expect(screen.getAllByRole("progressbar")).toHaveLength(budgets.length);

    rerender(<FinanceView {...viewProps({ view: "goals" })} />);
    expect(screen.getByText("Emergency reserve")).toBeVisible();

    rerender(<FinanceView {...viewProps({ view: "recurring" })} />);
    expect(screen.getByText("Monthly rent")).toBeVisible();

    const onImportComplete = vi.fn();
    rerender(
      <FinanceView {...viewProps({ view: "import", onImportComplete })} />,
    );
    expect(
      screen.getByRole("heading", { name: model.copy.importDescription }),
    ).toBeVisible();
  });
});
