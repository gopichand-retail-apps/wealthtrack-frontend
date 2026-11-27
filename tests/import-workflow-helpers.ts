import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import {
  importResult,
  installApiFetch,
  jsonResponse,
  model,
  pathnameOf,
} from "./wealthtrack-fixtures";

type FetchMock = ReturnType<typeof installApiFetch>;
export type User = ReturnType<typeof userEvent.setup>;

export function getCsvInput() {
  const input = document.querySelector<HTMLInputElement>("#wealthtrack-csv");
  if (!input) throw new Error("CSV file input should be rendered.");
  return input;
}

export function csvFile(contents: string) {
  const file = new File([contents], "transactions.csv", { type: "text/csv" });
  Object.defineProperty(file, "text", { value: async () => contents });
  return file;
}

export function commitKeys(fetchMock: FetchMock): Array<string | undefined> {
  return fetchMock.mock.calls
    .filter(([input]) => pathnameOf(input) === "/api/v1/imports")
    .map(
      ([, init]) =>
        (init?.headers as Record<string, string> | undefined)?.[
          "Idempotency-Key"
        ],
    );
}

export const connectionLost = () => Promise.reject(new TypeError("offline"));
export const committed = () => jsonResponse({ data: importResult }, 201);

/** First commit attempt fails the given way; every later attempt succeeds. */
export function failFirstThen(
  failure: () => Promise<Response> | Response,
  success: () => Response = committed,
) {
  let attempt = 0;
  return () => {
    attempt += 1;
    return attempt === 1 ? failure() : success();
  };
}

export function previewReply(
  invalidRows: Array<{ rowNumber: number; code: string }>,
) {
  return () =>
    jsonResponse({
      data: {
        validRows: [],
        invalidRows,
        validCount: 0,
        invalidCount: invalidRows.length,
        netAmountCents: 0,
      },
    });
}

export async function chooseAndPreview(user: User, contents = "file-a") {
  await user.upload(getCsvInput(), csvFile(contents));
  await user.click(
    screen.getByRole("button", { name: model.copy.previewImport }),
  );
  await screen.findByText(model.copy.previewSuccess);
}

export async function chooseAndPreviewInvalid(user: User) {
  await user.upload(getCsvInput(), csvFile("file-a"));
  await user.click(
    screen.getByRole("button", { name: model.copy.previewImport }),
  );
}

export function press(user: User, label: string) {
  return user.click(screen.getByRole("button", { name: label }));
}

export function heading(title: string) {
  return screen.findByRole("heading", { name: title });
}
