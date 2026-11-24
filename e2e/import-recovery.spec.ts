import { expect, test, type Page } from "@playwright/test";

const expectedDataMode = process.env.VITE_IS_MOCK === "false" ? "live" : "mock";
const apiUrl =
  process.env.WEALTHTRACK_API_URL ??
  `http://127.0.0.1:${process.env.WEALTHTRACK_API_PORT ?? "5904"}`;
const apiBaseUrl = `${apiUrl}/api/v1`;
const csvHeader = "date,description,category,account,amount,currency";
const today = new Date().toISOString().slice(0, 10);
const validCsv = `${csvHeader}\n${today},Recovery groceries,groceries,checking,-12.34,USD`;
const invalidCsv = `${csvHeader}\n${today},Bad amount,dining,checking,3.456,USD`;

async function importedRowCount(page: Page) {
  const response = await page.request.get(
    `${apiBaseUrl}/transactions?days=30&limit=500`,
  );
  const body = (await response.json()) as { data: Array<{ source: string }> };
  return body.data.filter((row) => row.source === "csv").length;
}

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
}

async function openImport(page: Page) {
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "Import", exact: true }).click();
}

async function chooseFile(page: Page, csv: string) {
  await page.locator("#wealthtrack-csv").setInputFiles({
    name: "household.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
}

/** Moves focus with the Tab key only, until the named button has it. */
async function tabTo(page: Page, name: string) {
  for (let presses = 0; presses < 12; presses += 1) {
    await page.keyboard.press("Tab");
    const label = await page.evaluate(
      () => document.activeElement?.textContent?.trim() ?? "",
    );
    if (label === name) return;
  }
  throw new Error(`The "${name}" button was not reachable with Tab.`);
}

/** Records every commit attempt's key and lets the test shape the reply. */
async function watchCommits(
  page: Page,
  firstAttempt: "reply-lost" | "request-lost" | "normal",
) {
  const keys: string[] = [];
  const requestIds: string[] = [];
  await page.route("**/api/v1/imports", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.continue();
    keys.push(request.headers()["idempotency-key"] ?? "");
    if (keys.length > 1 || firstAttempt === "normal") {
      const response = await route.fetch();
      requestIds.push(response.headers()["x-request-id"] ?? "");
      return route.fulfill({ response });
    }
    if (firstAttempt === "reply-lost") {
      const response = await route.fetch();
      requestIds.push(response.headers()["x-request-id"] ?? "");
    }
    return route.abort("connectionreset");
  });
  return { keys, requestIds };
}

test.beforeEach(async ({ page }) => {
  await page.route("**/wealthtrack-model.json", async (route) => {
    const response = await route.fetch();
    const model = (await response.json()) as {
      data: { app: { apiBaseUrl: string } };
    };
    model.data.app.apiBaseUrl = apiBaseUrl;
    await route.fulfill({ response, json: model });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Overview", level: 1 }),
  ).toBeVisible();
  await expect(page.locator(".finance-shell")).toHaveAttribute(
    "data-mode",
    expectedDataMode,
  );
});

test("a lost reply is recovered: same key, replayed batch, rows added once", async ({
  page,
}) => {
  const before = await importedRowCount(page);
  const { keys, requestIds } = await watchCommits(page, "reply-lost");
  await openImport(page);
  await chooseFile(page, validCsv);
  await page.getByRole("button", { name: "Preview import" }).click();
  await page.getByRole("button", { name: "Import transactions" }).click();

  const awaiting = page.getByRole("heading", {
    name: "Waiting for confirmation",
  });
  await expect(awaiting).toBeFocused();
  expect(await importedRowCount(page)).toBe(before + 1);

  await page.getByRole("button", { name: "Retry import" }).click();
  await expect(
    page.getByRole("heading", { name: "Already recorded" }),
  ).toBeFocused();
  await expect(page.getByText("no duplicate rows were added")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Import confirmed" }),
  ).toHaveCount(0);

  expect(await importedRowCount(page)).toBe(before + 1);
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBeTruthy();
  expect(keys[1]).toBe(keys[0]);
  expect(new Set(requestIds).size).toBe(requestIds.length);
});

test("a request that never arrived is retried with the same key and committed", async ({
  page,
}) => {
  const before = await importedRowCount(page);
  const { keys } = await watchCommits(page, "request-lost");
  await openImport(page);
  await chooseFile(page, validCsv);
  await page.getByRole("button", { name: "Preview import" }).click();
  await page.getByRole("button", { name: "Import transactions" }).click();
  await expect(
    page.getByRole("heading", { name: "Waiting for confirmation" }),
  ).toBeFocused();
  expect(await importedRowCount(page)).toBe(before);

  await page.getByRole("button", { name: "Retry import" }).click();
  await expect(
    page.getByRole("heading", { name: "Import confirmed" }),
  ).toBeFocused();

  expect(await importedRowCount(page)).toBe(before + 1);
  expect(keys[1]).toBe(keys[0]);
});

test("a reused key with different content is rejected by the API and writes nothing", async ({
  page,
}) => {
  const headers = { "Idempotency-Key": "playwright-conflict-import" };
  const post = (csvText: string) =>
    page.request.post(`${apiBaseUrl}/imports`, { headers, data: { csvText } });
  const first = await post(validCsv);
  const countAfterFirst = await importedRowCount(page);
  const changed = await post(validCsv.replace("-12.34", "-99.99"));
  const replay = await post(validCsv);

  expect(first.status()).toBe(201);
  expect(changed.status()).toBe(409);
  const body = (await changed.json()) as {
    error: { code: string; message: string };
  };
  expect(body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
  expect(body.error.message).toContain("different file");
  expect(replay.status()).toBe(200);
  expect(await importedRowCount(page)).toBe(countAfterFirst);
});

test("keyboard-only at 320 px: fix the rows, then confirm the import", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const before = await importedRowCount(page);
  await openImport(page);

  await chooseFile(page, invalidCsv);
  await page.locator("#wealthtrack-csv").focus();
  await tabTo(page, "Preview import");
  await page.keyboard.press("Enter");
  const needsFix = page.getByRole("heading", { name: "Needs correction" });
  await expect(needsFix).toBeFocused();
  await expect(
    page.getByText("Use an amount with at most two decimal places"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import transactions" }),
  ).toBeDisabled();
  expect(await noHorizontalOverflow(page)).toBe(true);

  await chooseFile(page, validCsv);
  await page.locator("#wealthtrack-csv").focus();
  await tabTo(page, "Preview import");
  await page.keyboard.press("Enter");
  await expect(page.getByText("The file is ready to import.")).toBeVisible();
  await tabTo(page, "Import transactions");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Import confirmed" }),
  ).toBeFocused();
  expect(await noHorizontalOverflow(page)).toBe(true);
  expect(await importedRowCount(page)).toBe(before + 1);
});

for (const width of [320, 390, 768, 1280]) {
  test(`import states fit the viewport at ${width} px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await watchCommits(page, "reply-lost");
    await openImport(page);

    await chooseFile(page, invalidCsv);
    await page.getByRole("button", { name: "Preview import" }).click();
    await expect(
      page.getByRole("heading", { name: "Needs correction" }),
    ).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`needs-correction-${width}.png`),
      fullPage: true,
    });

    await chooseFile(page, validCsv);
    await page.getByRole("button", { name: "Preview import" }).click();
    await page.getByRole("button", { name: "Import transactions" }).click();
    await expect(
      page.getByRole("heading", { name: "Waiting for confirmation" }),
    ).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`awaiting-${width}.png`),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Retry import" }).click();
    await expect(
      page.getByRole("heading", { name: "Already recorded" }),
    ).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`recorded-${width}.png`),
      fullPage: true,
    });
  });
}
