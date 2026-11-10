import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  importPreview,
  installApiFetch,
  jsonResponse,
  model,
} from "../../tests/wealthtrack-fixtures";
import { ImportWorkflow } from "./ImportWorkflow";

function getCsvInput() {
  const input = document.querySelector<HTMLInputElement>("#wealthtrack-csv");
  if (!input) throw new Error("CSV file input should be rendered.");
  return input;
}

function csvFile(
  name = "transactions.csv",
  type = "text/csv",
  contents = "csv",
) {
  const file = new File([contents], name, { type });
  Object.defineProperty(file, "text", { value: async () => contents });
  return file;
}

describe("CSV import workflow", () => {
  it("previews validated rows before committing and refreshes the workspace", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    installApiFetch();
    render(<ImportWorkflow model={model} onComplete={onComplete} />);

    await user.upload(getCsvInput(), csvFile());
    await user.click(
      screen.getByRole("button", { name: model.copy.previewImport }),
    );
    expect(await screen.findByText(model.copy.previewSuccess)).toBeVisible();
    expect(screen.getByText(String(importPreview.validCount))).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: model.copy.confirmImport }),
    );
    expect(await screen.findByText(model.copy.importSuccess)).toBeVisible();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("rejects unsupported and oversized files without requesting a preview", async () => {
    const fetchMock = installApiFetch();
    render(<ImportWorkflow model={model} onComplete={() => {}} />);

    fireEvent.change(getCsvInput(), {
      target: { files: [csvFile("transactions.txt", "text/plain")] },
    });
    expect(await screen.findByText(model.copy.invalidFile)).toBeVisible();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("/imports/preview"),
      ),
    ).toBe(false);

    const largeFile = csvFile(
      "large.csv",
      "text/csv",
      "x".repeat(model.csv.maximumBytes + 1),
    );
    fireEvent.change(getCsvInput(), { target: { files: [largeFile] } });
    expect(
      await screen.findByText(model.copy.importIssues.payloadTooLarge),
    ).toBeVisible();
  });

  it("shows row-level validation issues and keeps invalid imports disabled", async () => {
    const user = userEvent.setup();
    installApiFetch({
      "/api/v1/imports/preview": () =>
        jsonResponse({
          data: {
            validRows: [],
            invalidRows: [{ rowNumber: 2, code: "invalidAmount" }],
            validCount: 0,
            invalidCount: 1,
            netAmountCents: 0,
          },
        }),
    });
    render(<ImportWorkflow model={model} onComplete={() => {}} />);

    await user.upload(getCsvInput(), csvFile());
    await user.click(
      screen.getByRole("button", { name: model.copy.previewImport }),
    );
    expect(
      await screen.findByText(/Use an amount with at most two decimal places/),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: model.copy.confirmImport }),
    ).toBeDisabled();
  });

  it("surfaces API errors when preview fails and allows cancellation", async () => {
    const user = userEvent.setup();
    installApiFetch({
      "/api/v1/imports/preview": () =>
        jsonResponse({ error: { code: "INVALID_CSV" } }, 422),
    });
    render(<ImportWorkflow model={model} onComplete={() => {}} />);

    await user.upload(getCsvInput(), csvFile());
    await user.click(
      screen.getByRole("button", { name: model.copy.previewImport }),
    );
    expect(await screen.findByText(model.copy.errors.invalidCsv)).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: model.copy.cancelImport }),
    );
    expect(screen.queryByText("transactions.csv")).not.toBeInTheDocument();
  });

  it("downloads the configured template", async () => {
    const user = userEvent.setup();
    installApiFetch();
    const createObjectUrl = vi.fn(
      (_blob: Blob | MediaSource) => "blob:wealthtrack-template",
    );
    const revokeObjectUrl = vi.fn();
    class TestURL extends URL {
      static createObjectURL = createObjectUrl;
      static revokeObjectURL = revokeObjectUrl;
    }
    vi.stubGlobal("URL", TestURL);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<ImportWorkflow model={model} onComplete={() => {}} />);

    await user.click(
      screen.getByRole("link", { name: model.copy.downloadTemplate }),
    );
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:wealthtrack-template");
  });
});
