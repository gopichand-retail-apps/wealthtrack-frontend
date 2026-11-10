import { expect, test } from "@playwright/test";
import { z } from "zod";

const pageTitle = "Overview";
const expectedDataMode = process.env.VITE_IS_MOCK === "false" ? "live" : "mock";
const apiUrl =
  process.env.WEALTHTRACK_API_URL ??
  `http://127.0.0.1:${process.env.WEALTHTRACK_API_PORT ?? "5904"}`;
const apiBaseUrl = `${apiUrl}/api/v1`;
const publicModelSchema = z
  .object({
    version: z.number(),
    appId: z.literal("wealthtrack"),
    data: z
      .object({
        app: z.object({ apiBaseUrl: z.string() }).passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

declare global {
  interface Window {
    captureCsvExport: (csvText: string) => Promise<void>;
  }
}

async function transactionCount(page: import("@playwright/test").Page) {
  const response = await page.request.get(
    `${apiBaseUrl}/transactions?days=30&limit=500`,
  );
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { data: unknown[] };
  return payload.data.length;
}

test.beforeEach(async ({ page }) => {
  await page.route("**/wealthtrack-model.json", async (route) => {
    const response = await route.fetch();
    const parsed = publicModelSchema.safeParse(await response.json());
    if (!parsed.success)
      throw new Error("The public finance model is invalid.");
    parsed.data.data.app.apiBaseUrl = apiBaseUrl;
    await route.fulfill({ response, json: parsed.data });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: pageTitle, level: 1 }),
  ).toBeVisible();
  await expect(page.locator(".finance-shell")).toHaveAttribute(
    "data-mode",
    expectedDataMode,
  );
});

test("Flow 1: opens the finance workspace with live summary data", async ({
  page,
}) => {
  await expect(page.locator(".metric-card")).toHaveCount(4);
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  await expect(page.getByText("Finance service connected")).toBeVisible();
});

test("Flow 2: reviews cash flow and categorized spending", async ({ page }) => {
  await expect(page.getByRole("img", { name: /Cash flow: \d+/ })).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Spending by category" }),
  ).toBeVisible();
});

test("Flow 3: filters transactions by category and account", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Transactions", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  const transactionRegion = page.getByRole("region", { name: "Transactions" });
  const category = transactionRegion.getByRole("combobox", {
    name: "Filter category",
  });
  await category.selectOption("groceries");
  await expect(category).toHaveValue("groceries");
  const account = transactionRegion.getByRole("combobox", { name: "Account" });
  await account.selectOption("checking");
  await expect(account).toHaveValue("checking");
});

test("Flow 4: validates a CSV and displays a preview before commit", async ({
  page,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.locator("#wealthtrack-csv").setInputFiles({
    name: "household.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `date,description,category,account,amount,currency\n${today},Market groceries,groceries,checking,-64.18,USD`,
    ),
  });
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(
    page.getByRole("heading", { name: "Review before importing" }),
  ).toBeVisible();
  await expect(page.getByText("Valid rows").locator("..")).toContainText("1");
});

test("Flow 5: rejects invalid CSV without changing stored transactions", async ({
  page,
}) => {
  const beforeCount = await transactionCount(page);
  const today = new Date().toISOString().slice(0, 10);
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.locator("#wealthtrack-csv").setInputFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `date,description,category,account,amount,currency\n${today},Bad amount,dining,checking,3.456,USD`,
    ),
  });
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(
    page.getByText(
      "Use an amount with at most two decimal places and not zero.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import transactions" }),
  ).toBeDisabled();
  expect(await transactionCount(page)).toBe(beforeCount);
});

test("unsafe aggregate-cent imports remain uncommittable", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.locator("#wealthtrack-csv").setInputFiles({
    name: "unsafe-total.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `date,description,category,account,amount,currency\n${today},Large one,groceries,checking,-45035996273704.96,USD\n${today},Large two,groceries,checking,-45035996273704.96,USD`,
    ),
  });
  await page.getByRole("button", { name: "Preview import" }).click();

  await expect(
    page.getByText(
      "This import would exceed the exact calculation range. Reduce the amounts or replace the local dataset.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import transactions" }),
  ).toBeDisabled();
});

test("Flow 6: commits a valid import and refreshes the dashboard", async ({
  page,
}) => {
  const beforeCount = await transactionCount(page);
  const today = new Date().toISOString().slice(0, 10);
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.locator("#wealthtrack-csv").setInputFiles({
    name: "income.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `date,description,category,account,amount,currency\n${today},Payroll,income,checking,2500.00,USD`,
    ),
  });
  await page.getByRole("button", { name: "Preview import" }).click();
  await page.getByRole("button", { name: "Import transactions" }).click();
  await expect(
    page.getByText("Transactions imported successfully."),
  ).toBeVisible();
  expect(await transactionCount(page)).toBe(beforeCount + 1);
});

test("transaction CSV export neutralizes formula text and preserves exact cents", async ({
  page,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const description = '=HYPERLINK("https://example.invalid","Open")';
  const csvField = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const csvText = [
    "date,description,category,account,amount,currency",
    [today, description, "groceries", "checking", "-64.18", "USD"]
      .map(csvField)
      .join(","),
  ].join("\n");
  const response = await page.request.post(`${apiBaseUrl}/imports`, {
    headers: { "Idempotency-Key": "playwright-formula-safe-export" },
    data: { csvText },
  });
  expect(response.status()).toBe(201);

  let exportedCsv: string | undefined;
  await page.exposeFunction("captureCsvExport", (csv: string) => {
    exportedCsv = csv;
  });
  await page.evaluate(() => {
    const createObjectUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      void blob.text().then((csv) => window.captureCsvExport(csv));
      return createObjectUrl(blob);
    };
    HTMLAnchorElement.prototype.click = () => {};
  });

  await page.getByRole("button", { name: "Transactions", exact: true }).click();
  await page
    .getByRole("button", { name: "Export transactions", exact: true })
    .click();
  await expect.poll(() => exportedCsv).toBeDefined();
  expect(exportedCsv).toContain(
    `"'=HYPERLINK(""https://example.invalid"",""Open"")"`,
  );
  expect(exportedCsv).toContain(',"-64.18",');
  expect(exportedCsv).not.toContain(`,"'-64.18",`);
});

test("CSV template downloads and the API replays idempotent imports", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Import", exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download CSV template" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("wealthtrack-transactions.csv");

  const today = new Date().toISOString().slice(0, 10);
  const csvText = `date,description,category,account,amount,currency\n${today},Idempotent sample,income,checking,5.00,USD`;
  const headers = { "Idempotency-Key": "playwright-idempotent-import" };
  const first = await page.request.post(`${apiBaseUrl}/imports`, {
    headers,
    data: { csvText },
  });
  const second = await page.request.post(`${apiBaseUrl}/imports`, {
    headers,
    data: { csvText },
  });
  expect(first.status()).toBe(201);
  expect(second.status()).toBe(200);
  expect((await second.json()).data.replayed).toBe(true);
});

test("Flow 7: reviews monthly budget thresholds", async ({ page }) => {
  await page.getByRole("button", { name: "Budgets", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Budgets", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Monthly limit").first()).toBeVisible();
});

test("Flow 8: tracks a savings goal", async ({ page }) => {
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Goals", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Emergency reserve")).toBeVisible();
});

test("Flow 9: reviews upcoming recurring commitments", async ({ page }) => {
  await page.getByRole("button", { name: "Recurring", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Recurring commitments", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Monthly rent")).toBeVisible();
});

test("keeps architecture documentation outside the product UI", async ({
  page,
}) => {
  await expect(
    page.getByRole("button", { name: "Architecture", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Application architecture" }),
  ).toHaveCount(0);

  const response = await page.request.get("/wealthtrack-model.json");
  const contentModel = await response.json();
  expect(contentModel).toMatchObject({ version: 1, appId: "wealthtrack" });
  expect(contentModel.data).not.toHaveProperty("architecture");
  expect(contentModel.data.navigation).not.toContainEqual(
    expect.objectContaining({ id: "architecture" }),
  );
  const publicArchitecture = await page.request.get("/architecture.md");
  expect(publicArchitecture.headers()["content-type"]).toContain("text/html");
  expect(await publicArchitecture.text()).not.toContain(
    "WealthTrack Architecture Reference",
  );
});

test("replaces model locale, shopper copy, and document metadata", async ({
  page,
}) => {
  const response = await page.request.get("/wealthtrack-model.json");
  const englishModel = await response.json();
  const localizedModel = {
    ...englishModel,
    locale: "fr-FR",
    messages: {
      ...englishModel.messages,
      overview: "Vue d’ensemble",
    },
    data: {
      ...englishModel.data,
      app: {
        ...englishModel.data.app,
        descriptor: "Espace financier",
        description: "Une vue claire des finances synthétiques.",
      },
    },
  };
  await page.route("**/wealthtrack-model.json", (route) =>
    route.fulfill({ json: localizedModel }),
  );
  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Vue d’ensemble", level: 1 }),
  ).toBeVisible();
  await expect(page).toHaveTitle("WealthTrack | Espace financier");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Une vue claire des finances synthétiques.",
  );
});

test("maps API error codes to model copy without exposing server messages", async ({
  page,
}) => {
  const rawMessage = "Internal database connection details";
  await page.route("**/api/v1/summary*", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: rawMessage,
          requestId: "test-request",
        },
      }),
    });
  });
  await page.getByRole("button", { name: "Refresh data" }).click();
  await expect(
    page.getByText("The request could not be completed. Try again.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(rawMessage, { exact: true })).toHaveCount(0);
});

test("recovers after a finance API interruption", async ({ page }) => {
  const summaryRoute = "**/api/v1/summary*";
  await page.route(summaryRoute, (route) => route.abort());
  await page.getByRole("button", { name: "Refresh data" }).click();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.unroute(summaryRoute);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Finance service connected")).toBeVisible();
});

test("shows offline status and refreshes data after reconnection", async ({
  page,
}) => {
  await page.context().setOffline(true);
  await expect(
    page.getByText(
      "Your device is offline. Displayed records may be out of date; current data will load when you reconnect.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText("Device offline", { exact: true })).toBeVisible();

  const refreshedSummary = page.waitForRequest((request) =>
    request.url().includes("/api/v1/summary"),
  );
  await page.context().setOffline(false);
  await refreshedSummary;
  await expect(
    page.getByText("Finance service connected", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Your device is offline. Displayed records may be out of date; current data will load when you reconnect.",
      { exact: true },
    ),
  ).toHaveCount(0);
});

test("theme toggle changes appearance and mobile layout fits viewport", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Toggle light and dark mode" })
    .click();
  await expect(page.locator(".finance-shell")).toHaveAttribute(
    "data-theme",
    "dark",
  );
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("wealthtrack-theme")))
    .toBe("dark");
  await page.reload();
  await expect(page.locator(".finance-shell")).toHaveAttribute(
    "data-theme",
    "dark",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(390);
  const width = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(width.page).toBe(width.viewport);
});
