import type { Ref } from "react";
import { copy, formatMoney, nestedCopy } from "../lib/format";
import type { ImportOutcome } from "../lib/importOutcome";
import type { ImportIssue, PublicModel } from "../lib/types";

const maximumVisibleIssues = 20;

interface ImportOutcomePanelProps {
  model: PublicModel;
  outcome: ImportOutcome;
  headingRef: Ref<HTMLHeadingElement>;
}

function issueText(model: PublicModel, issue: ImportIssue): string {
  const message = nestedCopy(model, "importIssues", issue.code);
  return issue.rowNumber > 0
    ? `${copy(model, "rowNumber")} ${issue.rowNumber}: ${message}`
    : message;
}

function titleKey(outcome: ImportOutcome): string {
  switch (outcome.kind) {
    case "committed":
      return "importCommittedTitle";
    case "replayed":
      return "importReplayedTitle";
    case "awaiting":
      return "importAwaitingTitle";
    case "needsCorrection":
      return "importNeedsCorrectionTitle";
    default:
      return "importNotSavedTitle";
  }
}

function detailText(model: PublicModel, outcome: ImportOutcome): string {
  switch (outcome.kind) {
    case "committed":
      return copy(model, "importSuccess");
    case "replayed":
      return copy(model, "importDuplicate");
    case "awaiting":
      return copy(model, "importAwaitingHelp");
    case "needsCorrection":
      return copy(model, "importNeedsCorrectionHelp");
    default:
      return outcome.message;
  }
}

/** A saved import needs no action, so it is announced politely. The rest do. */
function isSettled(outcome: ImportOutcome): boolean {
  return outcome.kind === "committed" || outcome.kind === "replayed";
}

export function ImportOutcomePanel({
  model,
  outcome,
  headingRef,
}: ImportOutcomePanelProps) {
  return (
    <section
      className={`panel import-outcome is-${outcome.kind}`}
      aria-labelledby="import-outcome-title"
    >
      <div role={isSettled(outcome) ? "status" : "alert"}>
        <h2 id="import-outcome-title" ref={headingRef} tabIndex={-1}>
          {copy(model, titleKey(outcome))}
        </h2>
        <p>{detailText(model, outcome)}</p>
        {outcome.kind === "committed" || outcome.kind === "replayed" ? (
          <div className="preview-summary is-pair">
            <div>
              <span>{copy(model, "importRowsAdded")}</span>
              <strong>{outcome.result.rowsAdded}</strong>
            </div>
            <div>
              <span>{copy(model, "importTotal")}</span>
              <strong>
                {formatMoney(model, outcome.result.totalNetCents)}
              </strong>
            </div>
          </div>
        ) : null}
        {outcome.kind === "needsCorrection" ? (
          <IssueList model={model} issues={outcome.issues} />
        ) : null}
      </div>
    </section>
  );
}

function IssueList({
  model,
  issues,
}: {
  model: PublicModel;
  issues: ImportIssue[];
}) {
  const hiddenCount = issues.length - maximumVisibleIssues;
  return (
    <>
      <ul className="import-issue-list">
        {issues.slice(0, maximumVisibleIssues).map((issue) => (
          <li key={`${issue.rowNumber}-${issue.code}`}>
            {issueText(model, issue)}
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <p>
          {hiddenCount} {copy(model, "importMoreIssues")}
        </p>
      ) : null}
    </>
  );
}
