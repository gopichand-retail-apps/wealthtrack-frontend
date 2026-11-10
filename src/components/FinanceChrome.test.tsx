import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { model } from "../../tests/wealthtrack-fixtures";
import {
  FinancePageHeading,
  FinanceSidebar,
  FinanceTopbar,
  ReportFilters,
} from "./FinanceChrome";

describe("WealthTrack navigation and controls", () => {
  it("supports mobile navigation and falls back for an unrecognized icon", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onClose = vi.fn();
    const changedModel = structuredClone(model);
    changedModel.navigation[0].icon = "UnrecognizedIcon";
    render(
      <FinanceSidebar
        model={changedModel}
        activeView="overview"
        mobileOpen
        onNavigate={onNavigate}
        onClose={onClose}
      />,
    );

    expect(
      screen.getByRole("button", { name: model.copy.closeNavigation }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: model.copy.transactions }),
    );
    expect(onNavigate).toHaveBeenCalledWith("transactions");
    fireEvent.click(
      screen.getByRole("button", { name: model.copy.closeNavigation }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders offline, disconnected, and connected states with a theme action", async () => {
    const user = userEvent.setup();
    const onTheme = vi.fn();
    const onNavigation = vi.fn();
    const { rerender } = render(
      <FinanceTopbar
        model={model}
        activeView="overview"
        connected={false}
        offline
        theme="light"
        mobileOpen={false}
        onToggleTheme={onTheme}
        onToggleNavigation={onNavigation}
      />,
    );

    expect(screen.getByText(model.copy.deviceOffline)).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: model.copy.themeToggle }),
    );
    await user.click(
      screen.getByRole("button", { name: model.copy.openNavigation }),
    );
    expect(onTheme).toHaveBeenCalledOnce();
    expect(onNavigation).toHaveBeenCalledOnce();

    rerender(
      <FinanceTopbar
        model={model}
        activeView="transactions"
        connected={false}
        offline={false}
        theme="dark"
        mobileOpen
        onToggleTheme={onTheme}
        onToggleNavigation={onNavigation}
      />,
    );
    expect(screen.getByText(model.copy.serviceUnavailable)).toBeVisible();
    expect(
      screen.getByRole("button", { name: model.copy.closeNavigation }),
    ).toBeVisible();

    rerender(
      <FinanceTopbar
        model={model}
        activeView="overview"
        connected
        offline={false}
        theme="light"
        mobileOpen={false}
        onToggleTheme={onTheme}
        onToggleNavigation={onNavigation}
      />,
    );
    expect(screen.getByText(model.copy.serviceConnected)).toBeVisible();
  });

  it("calls page heading actions and exposes all report filters", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    const onExport = vi.fn();
    const onImport = vi.fn();
    const onPeriod = vi.fn();
    const onAccount = vi.fn();
    const onCategory = vi.fn();
    render(
      <>
        <FinancePageHeading
          model={model}
          activeView="overview"
          description={model.copy.overviewDescription}
          onRefresh={onRefresh}
          onExport={onExport}
          onImport={onImport}
        />
        <ReportFilters
          model={model}
          periodId="30d"
          accountId=""
          category=""
          onPeriod={onPeriod}
          onAccount={onAccount}
          onCategory={onCategory}
          accounts={[{ id: "checking", name: "Everyday checking" }]}
        />
      </>,
    );

    await user.click(
      screen.getByRole("button", { name: model.copy.refreshData }),
    );
    await user.click(screen.getByRole("button", { name: model.copy.export }));
    await user.click(screen.getByRole("button", { name: model.copy.import }));
    const filters = screen.getByRole("region", {
      name: model.copy.reportingPeriod,
    });
    const period = within(filters).getByRole("combobox", {
      name: model.copy.reportingPeriod,
    });
    const category = within(filters).getByRole("combobox", {
      name: model.copy.filterCategory,
    });
    const account = within(filters).getByRole("combobox", {
      name: model.copy.account,
    });
    await user.selectOptions(period, "7d");
    await user.selectOptions(category, "groceries");
    await user.selectOptions(account, "checking");

    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onExport).toHaveBeenCalledOnce();
    expect(onImport).toHaveBeenCalledOnce();
    expect(onPeriod).toHaveBeenCalledWith("7d");
    expect(onCategory).toHaveBeenCalledWith("groceries");
    expect(onAccount).toHaveBeenCalledWith("checking");
  });
});
