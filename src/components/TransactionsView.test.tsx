import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  accounts,
  model,
  transactions,
} from "../../tests/wealthtrack-fixtures";
import { TransactionsView } from "./TransactionsView";

describe("transactions view", () => {
  it("renders localized transaction rows and fires search/filter changes", () => {
    const onSearch = vi.fn();
    const onCategory = vi.fn();
    const onAccount = vi.fn();
    render(
      <TransactionsView
        model={model}
        transactions={[
          transactions[0],
          { ...transactions[1], accountId: "removed-account" },
        ]}
        accounts={accounts}
        search=""
        category=""
        accountId=""
        loading={false}
        onSearch={onSearch}
        onCategory={onCategory}
        onAccount={onAccount}
      />,
    );

    expect(screen.getByText(transactions[0].description)).toBeVisible();
    expect(screen.getByText("removed-account")).toBeVisible();
    expect(screen.getByText("$2,400.00")).toBeVisible();
    expect(screen.getByText("-$1,450.00")).toBeVisible();

    fireEvent.change(
      screen.getByRole("searchbox", { name: model.copy.searchTransactions }),
      {
        target: { value: "market" },
      },
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: model.copy.filterCategory }),
      {
        target: { value: "groceries" },
      },
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: model.copy.account }),
      {
        target: { value: "checking" },
      },
    );

    expect(onSearch).toHaveBeenCalledWith("market");
    expect(onCategory).toHaveBeenCalledWith("groceries");
    expect(onAccount).toHaveBeenCalledWith("checking");
  });

  it("shows loading instead of the empty state while a filter request is pending", () => {
    render(
      <TransactionsView
        model={model}
        transactions={[]}
        accounts={accounts}
        search=""
        category=""
        accountId=""
        loading
        onSearch={() => {}}
        onCategory={() => {}}
        onAccount={() => {}}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(model.copy.loading);
    expect(
      screen.queryByText(model.copy.noTransactions),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state when filtering returns no rows", () => {
    render(
      <TransactionsView
        model={model}
        transactions={[]}
        accounts={accounts}
        search="no-match"
        category=""
        accountId=""
        loading={false}
        onSearch={() => {}}
        onCategory={() => {}}
        onAccount={() => {}}
      />,
    );

    expect(screen.getByText(model.copy.noTransactions)).toBeVisible();
  });
});
