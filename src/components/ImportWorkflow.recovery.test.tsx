import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  importResult,
  installApiFetch,
  jsonResponse,
  model,
} from "../../tests/wealthtrack-fixtures";
import {
  chooseAndPreview,
  commitKeys,
  getCsvInput,
  connectionLost,
  failFirstThen,
  heading,
  press,
} from "../../tests/import-workflow-helpers";
import { ImportWorkflow } from "./ImportWorkflow";

describe("import recovery after a lost connection", () => {
  it("sends the same Idempotency-Key when the commit button is pressed again after a failure", async () => {
    const user = userEvent.setup();
    const fetchMock = installApiFetch({
      "/api/v1/imports": failFirstThen(connectionLost),
    });
    render(<ImportWorkflow model={model} onComplete={() => {}} />);
    await chooseAndPreview(user);
    const commitLabel = new RegExp(
      `^(${model.copy.confirmImport}|${model.copy.importRetry})$`,
    );
    const commitButton = () =>
      screen.getByRole("button", { name: commitLabel });

    await user.click(commitButton());
    await waitFor(() => expect(commitKeys(fetchMock)).toHaveLength(1));
    await waitFor(() => expect(commitButton()).toBeEnabled());
    await user.click(commitButton());
    await waitFor(() => expect(commitKeys(fetchMock)).toHaveLength(2));

    const keys = commitKeys(fetchMock);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  it("blocks choosing another file while a commit is in flight", async () => {
    const user = userEvent.setup();
    let reply: (response: Response) => void = () => {};
    installApiFetch({
      "/api/v1/imports": () =>
        new Promise<Response>((resolve) => {
          reply = resolve;
        }),
    });
    render(<ImportWorkflow model={model} onComplete={() => {}} />);
    await chooseAndPreview(user);

    await press(user, model.copy.confirmImport);
    await screen.findByRole("button", { name: model.copy.importing });
    expect(getCsvInput()).toBeDisabled();

    reply(jsonResponse({ data: importResult }, 201));
    await heading(model.copy.importCommittedTitle);
    expect(getCsvInput()).toBeEnabled();
  });

  it("keeps one Idempotency-Key across a retry and says the import is unconfirmed", async () => {
    const user = userEvent.setup();
    const fetchMock = installApiFetch({
      "/api/v1/imports": failFirstThen(connectionLost),
    });
    render(<ImportWorkflow model={model} onComplete={() => {}} />);
    await chooseAndPreview(user);

    await press(user, model.copy.confirmImport);
    const awaiting = await heading(model.copy.importAwaitingTitle);
    expect(awaiting.closest('[role="alert"]')).not.toBeNull();
    expect(screen.getByText(model.copy.importAwaitingHelp)).toBeVisible();
    await waitFor(() => expect(awaiting).toHaveFocus());
    expect(
      screen.queryByRole("button", { name: model.copy.confirmImport }),
    ).not.toBeInTheDocument();

    await press(user, model.copy.importRetry);
    await heading(model.copy.importCommittedTitle);

    const keys = commitKeys(fetchMock);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  it("tells a replayed import apart from a new one and shows the original batch", async () => {
    const user = userEvent.setup();
    installApiFetch({
      "/api/v1/imports": failFirstThen(connectionLost, () =>
        jsonResponse(
          { data: { ...importResult, rowsAdded: 3, replayed: true } },
          200,
        ),
      ),
    });
    render(<ImportWorkflow model={model} onComplete={() => {}} />);
    await chooseAndPreview(user);
    await press(user, model.copy.confirmImport);
    await heading(model.copy.importAwaitingTitle);

    await press(user, model.copy.importRetry);

    const replayed = await heading(model.copy.importReplayedTitle);
    const region = replayed.closest('[role="status"]') as HTMLElement;
    expect(region).not.toBeNull();
    expect(within(region).getByText(model.copy.importDuplicate)).toBeVisible();
    expect(region).toHaveTextContent(model.copy.importRowsAdded);
    expect(region).toHaveTextContent("3");
    expect(
      screen.queryByRole("heading", { name: model.copy.importCommittedTitle }),
    ).not.toBeInTheDocument();
  });

  it("announces a committed import and moves focus to the result", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    installApiFetch();
    render(<ImportWorkflow model={model} onComplete={onComplete} />);
    await chooseAndPreview(user);

    await press(user, model.copy.confirmImport);

    const confirmed = await heading(model.copy.importCommittedTitle);
    const region = confirmed.closest('[role="status"]') as HTMLElement;
    expect(region).not.toBeNull();
    await waitFor(() => expect(confirmed).toHaveFocus());
    expect(within(region).getByText(model.copy.importSuccess)).toBeVisible();
    expect(region).toHaveTextContent(model.copy.importRowsAdded);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("keeps the key when the same file is chosen again after an unconfirmed import", async () => {
    const user = userEvent.setup();
    const fetchMock = installApiFetch({
      "/api/v1/imports": failFirstThen(connectionLost),
    });
    render(<ImportWorkflow model={model} onComplete={() => {}} />);
    await chooseAndPreview(user, "file-a");
    await press(user, model.copy.confirmImport);
    await heading(model.copy.importAwaitingTitle);

    await chooseAndPreview(user, "file-a");
    await press(user, model.copy.confirmImport);
    await heading(model.copy.importCommittedTitle);

    const keys = commitKeys(fetchMock);
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
  });

  it("replaces the key when a different file is chosen after an unconfirmed import", async () => {
    const user = userEvent.setup();
    const fetchMock = installApiFetch({
      "/api/v1/imports": failFirstThen(connectionLost),
    });
    render(<ImportWorkflow model={model} onComplete={() => {}} />);
    await chooseAndPreview(user, "file-a");
    await press(user, model.copy.confirmImport);
    await heading(model.copy.importAwaitingTitle);

    await chooseAndPreview(user, "file-b");
    await press(user, model.copy.confirmImport);
    await heading(model.copy.importCommittedTitle);

    const keys = commitKeys(fetchMock);
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBeTruthy();
    expect(keys[1]).not.toBe(keys[0]);
  });

  it("discards the key after a confirmed result so the next import gets a new one", async () => {
    const user = userEvent.setup();
    const fetchMock = installApiFetch();
    render(<ImportWorkflow model={model} onComplete={() => {}} />);
    await chooseAndPreview(user, "file-a");
    await press(user, model.copy.confirmImport);
    await heading(model.copy.importCommittedTitle);

    await chooseAndPreview(user, "file-a");
    await press(user, model.copy.confirmImport);
    await waitFor(() => expect(commitKeys(fetchMock)).toHaveLength(2));

    const keys = commitKeys(fetchMock);
    expect(keys[1]).not.toBe(keys[0]);
  });

  it("discards the key when the planner cancels the import", async () => {
    const user = userEvent.setup();
    const fetchMock = installApiFetch({
      "/api/v1/imports": failFirstThen(connectionLost),
    });
    render(<ImportWorkflow model={model} onComplete={() => {}} />);
    await chooseAndPreview(user, "file-a");
    await press(user, model.copy.confirmImport);
    await heading(model.copy.importAwaitingTitle);

    await press(user, model.copy.cancelImport);
    expect(
      screen.queryByRole("heading", { name: model.copy.importAwaitingTitle }),
    ).not.toBeInTheDocument();
    await chooseAndPreview(user, "file-a");
    await press(user, model.copy.confirmImport);
    await heading(model.copy.importCommittedTitle);

    const keys = commitKeys(fetchMock);
    expect(keys[1]).not.toBe(keys[0]);
  });

  it("keeps the key and offers a normal retry when the server refused without saving", async () => {
    const user = userEvent.setup();
    const fetchMock = installApiFetch({
      "/api/v1/imports": failFirstThen(() =>
        jsonResponse({ error: { code: "RATE_LIMITED" } }, 429),
      ),
    });
    render(<ImportWorkflow model={model} onComplete={() => {}} />);
    await chooseAndPreview(user);

    await press(user, model.copy.confirmImport);
    const refused = await heading(model.copy.importNotSavedTitle);
    expect(refused.closest('[role="alert"]')).not.toBeNull();
    expect(screen.getByText(model.copy.errors.rateLimited)).toBeVisible();
    await press(user, model.copy.confirmImport);
    await heading(model.copy.importCommittedTitle);

    const keys = commitKeys(fetchMock);
    expect(keys[1]).toBe(keys[0]);
  });

  it("shows a reused-key conflict and asks for a new preview", async () => {
    const user = userEvent.setup();
    installApiFetch({
      "/api/v1/imports": () =>
        jsonResponse({ error: { code: "IDEMPOTENCY_KEY_REUSED" } }, 409),
    });
    render(<ImportWorkflow model={model} onComplete={() => {}} />);
    await chooseAndPreview(user);

    await press(user, model.copy.confirmImport);

    const conflict = await heading(model.copy.importNotSavedTitle);
    await waitFor(() => expect(conflict).toHaveFocus());
    expect(
      screen.getByText(model.copy.errors.idempotencyKeyReused),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: model.copy.confirmImport }),
    ).not.toBeInTheDocument();
  });
});
