import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  installApiFetch,
  jsonResponse,
  model,
  summary,
  transactions,
} from "../../tests/wealthtrack-fixtures";
import { WealthTrackApp } from "./WealthTrackApp";

describe("WealthTrack workspace", () => {
  it("loads the model, document metadata, summary, and connected service state", async () => {
    installApiFetch();
    render(<WealthTrackApp />);

    expect(
      await screen.findByRole("heading", {
        name: model.copy.overview,
        level: 1,
      }),
    ).toBeVisible();
    await waitFor(() =>
      expect(document.querySelectorAll(".metric-card")).toHaveLength(4),
    );
    expect(screen.getByText(model.copy.serviceConnected)).toBeVisible();
    expect(document.title).toBe(`${model.app.name} | ${model.app.descriptor}`);
    expect(document.documentElement.lang).toBe("en");
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      model.app.description,
    );
    expect(document.querySelector(".finance-shell")).toHaveAttribute(
      "data-mode",
      "mock",
    );
  });

  it("shows a visible bootstrap error if the content model cannot be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("missing", { status: 404 })),
    );
    render(<WealthTrackApp />);

    expect(await screen.findByText("CONTENT_MODEL_UNAVAILABLE")).toBeVisible();
  });

  it("updates existing document description metadata from the content model", async () => {
    const description = document.createElement("meta");
    description.name = "description";
    description.content = "old description";
    document.head.append(description);
    installApiFetch();
    render(<WealthTrackApp />);

    await screen.findByRole("heading", { name: model.copy.overview, level: 1 });
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(
      1,
    );
    expect(description.content).toBe(model.app.description);
  });

  it("navigates among transactions, budgets, goals, recurring items, and imports", async () => {
    const user = userEvent.setup();
    installApiFetch();
    render(<WealthTrackApp />);
    const navigation = await screen.findByRole("navigation", {
      name: model.copy.primaryNavigation,
    });

    await user.click(
      within(navigation).getByRole("button", { name: model.copy.transactions }),
    );
    expect(await screen.findByRole("table")).toBeVisible();
    expect(screen.getByText("Market groceries")).toBeVisible();

    await user.click(
      within(navigation).getByRole("button", { name: model.copy.budgets }),
    );
    expect(await screen.findByText(model.copy.overBudget)).toBeVisible();
    expect(screen.getAllByRole("progressbar")).toHaveLength(
      model.seed.budgets.length,
    );

    await user.click(
      within(navigation).getByRole("button", { name: model.copy.goals }),
    );
    expect(await screen.findByText("Emergency reserve")).toBeVisible();

    const recurringNavigation = model.navigation.find(
      (item) => item.id === "recurring",
    );
    if (!recurringNavigation)
      throw new Error("Recurring navigation should be in the model.");
    await user.click(
      within(navigation).getByRole("button", {
        name: recurringNavigation.label,
      }),
    );
    expect(await screen.findByText("Monthly rent")).toBeVisible();

    const importNavigation = model.navigation.find(
      (item) => item.id === "import",
    );
    if (!importNavigation)
      throw new Error("Import navigation should be in the model.");
    await user.click(
      within(navigation).getByRole("button", { name: importNavigation.label }),
    );
    expect(
      await screen.findByRole("heading", { name: model.copy.import, level: 1 }),
    ).toBeVisible();
  });

  it("displays disconnected state and reloads after reconnecting", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    installApiFetch();
    render(<WealthTrackApp />);

    expect(await screen.findByText(model.copy.offlineNotice)).toBeVisible();
    expect(screen.getByText(model.copy.deviceOffline)).toBeVisible();

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
    window.dispatchEvent(new Event("online"));
    await waitFor(() =>
      expect(screen.getByText(model.copy.serviceConnected)).toBeVisible(),
    );
    expect(
      screen.queryByText(model.copy.offlineNotice),
    ).not.toBeInTheDocument();
  });

  it("shows a safe API error and recovers when the user retries", async () => {
    let summaryRequests = 0;
    const fetchMock = installApiFetch({
      "/api/v1/summary": () =>
        summaryRequests++ === 0
          ? jsonResponse(
              {
                error: {
                  code: "INTERNAL_ERROR",
                  message: "private database detail",
                },
              },
              500,
            )
          : jsonResponse({ data: summary }),
    });
    render(<WealthTrackApp />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      model.copy.errors.server,
    );
    expect(
      screen.queryByText("private database detail"),
    ).not.toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: model.copy.retry }));
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(7));
    await waitFor(() =>
      expect(document.querySelectorAll(".metric-card")).toHaveLength(4),
    );
  });

  it("exports the visible transaction set through the safe CSV serializer", async () => {
    const user = userEvent.setup();
    installApiFetch();
    const createObjectUrl = vi.fn(
      (_blob: Blob | MediaSource) => "blob:wealthtrack-export",
    );
    const revokeObjectUrl = vi.fn();
    class TestURL extends URL {
      static createObjectURL = createObjectUrl;
      static revokeObjectURL = revokeObjectUrl;
    }
    vi.stubGlobal("URL", TestURL);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<WealthTrackApp />);

    await screen.findByRole("heading", { name: model.copy.overview, level: 1 });
    await user.click(screen.getByRole("button", { name: model.copy.export }));

    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:wealthtrack-export");
    expect(await screen.findByText(model.copy.exportReady)).toBeVisible();
  });

  it("persists appearance and opens or closes mobile navigation", async () => {
    const user = userEvent.setup();
    installApiFetch();
    render(<WealthTrackApp />);
    await screen.findByRole("heading", { name: model.copy.overview, level: 1 });

    await user.click(
      screen.getByRole("button", { name: model.copy.themeToggle }),
    );
    expect(document.querySelector(".finance-shell")).toHaveAttribute(
      "data-theme",
      "dark",
    );
    await waitFor(() =>
      expect(window.localStorage.getItem(model.app.themeStorageKey)).toBe(
        "dark",
      ),
    );

    await user.click(
      screen.getByRole("button", { name: model.copy.openNavigation }),
    );
    expect(document.querySelector(".navigation-scrim")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: model.copy.transactions }),
    );
    expect(document.querySelector(".navigation-scrim")).not.toBeInTheDocument();
  });

  it("shows a safe notice if transaction export fails", async () => {
    let exportFailure = false;
    installApiFetch({
      "/api/v1/transactions": (input) => {
        const url = new URL(String(input));
        if (exportFailure && url.searchParams.get("limit") === "500") {
          return jsonResponse(
            {
              error: {
                code: "INTERNAL_ERROR",
                message: "private export detail",
              },
            },
            500,
          );
        }
        return jsonResponse({ data: transactions });
      },
    });
    render(<WealthTrackApp />);
    await waitFor(() =>
      expect(document.querySelectorAll(".metric-card")).toHaveLength(4),
    );
    exportFailure = true;
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: model.copy.export }));

    expect(await screen.findByText(model.copy.errors.server)).toBeVisible();
    expect(screen.queryByText("private export detail")).not.toBeInTheDocument();
  });
});
