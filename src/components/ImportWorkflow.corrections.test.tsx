import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  installApiFetch,
  jsonResponse,
  model,
} from "../../tests/wealthtrack-fixtures";
import {
  chooseAndPreview,
  chooseAndPreviewInvalid,
  commitKeys,
  failFirstThen,
  heading,
  press,
  previewReply,
} from "../../tests/import-workflow-helpers";
import { ImportWorkflow } from "./ImportWorkflow";

describe("rows that need correction", () => {
  it("announces the rows from a preview and moves focus to them without calling the import API", async () => {
    const user = userEvent.setup();
    const fetchMock = installApiFetch({
      "/api/v1/imports/preview": previewReply([
        { rowNumber: 2, code: "invalidAmount" },
      ]),
    });
    render(<ImportWorkflow model={model} onComplete={() => {}} />);

    await chooseAndPreviewInvalid(user);

    const needsFix = await heading(model.copy.importNeedsCorrectionTitle);
    const region = needsFix.closest('[role="alert"]') as HTMLElement;
    expect(region).not.toBeNull();
    await waitFor(() => expect(needsFix).toHaveFocus());
    expect(
      within(region).getByText(model.copy.importNeedsCorrectionHelp),
    ).toBeVisible();
    expect(within(region).getAllByRole("listitem")).toHaveLength(1);
    expect(region).toHaveTextContent(
      `${model.copy.rowNumber} 2: ${model.copy.importIssues.invalidAmount}`,
    );
    expect(commitKeys(fetchMock)).toHaveLength(0);
  });

  it("shows the rows the server rejected at commit and discards the key", async () => {
    const user = userEvent.setup();
    const fetchMock = installApiFetch({
      "/api/v1/imports": failFirstThen(() =>
        jsonResponse(
          {
            error: {
              code: "INVALID_CSV",
              details: [{ rowNumber: 3, code: "invalidDate" }],
            },
          },
          422,
        ),
      ),
    });
    render(<ImportWorkflow model={model} onComplete={() => {}} />);
    await chooseAndPreview(user, "file-a");

    await press(user, model.copy.confirmImport);

    const needsFix = await heading(model.copy.importNeedsCorrectionTitle);
    expect(needsFix.closest('[role="alert"]')).not.toBeNull();
    expect(screen.getByText(/Row 3/)).toHaveTextContent(
      model.copy.importIssues.invalidDate,
    );
    expect(
      screen.queryByRole("button", { name: model.copy.confirmImport }),
    ).not.toBeInTheDocument();

    await chooseAndPreview(user, "file-a");
    await press(user, model.copy.confirmImport);
    await heading(model.copy.importCommittedTitle);
    const keys = commitKeys(fetchMock);
    expect(keys[1]).not.toBe(keys[0]);
  });

  it("lists the first twenty rows and counts the rest", async () => {
    const user = userEvent.setup();
    installApiFetch({
      "/api/v1/imports/preview": previewReply(
        Array.from({ length: 25 }, (_, index) => ({
          rowNumber: index + 2,
          code: "invalidDate",
        })),
      ),
    });
    render(<ImportWorkflow model={model} onComplete={() => {}} />);

    await chooseAndPreviewInvalid(user);

    const needsFix = await heading(model.copy.importNeedsCorrectionTitle);
    const region = needsFix.closest('[role="alert"]') as HTMLElement;
    expect(within(region).getAllByRole("listitem")).toHaveLength(20);
    expect(region).toHaveTextContent(`5 ${model.copy.importMoreIssues}`);
  });

  it("shows file-level issues without a row number", async () => {
    const user = userEvent.setup();
    installApiFetch({
      "/api/v1/imports/preview": previewReply([
        { rowNumber: 0, code: "aggregateAmount" },
      ]),
    });
    render(<ImportWorkflow model={model} onComplete={() => {}} />);

    await chooseAndPreviewInvalid(user);

    await heading(model.copy.importNeedsCorrectionTitle);
    expect(
      screen.getByText(model.copy.importIssues.aggregateAmount),
    ).toBeVisible();
    expect(screen.queryByText(/Row 0/)).not.toBeInTheDocument();
  });
});
