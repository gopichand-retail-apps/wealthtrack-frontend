"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileUp,
  LoaderCircle,
  RotateCcw,
  Upload,
} from "lucide-react";
import {
  ApiError,
  commitImport,
  downloadTemplate,
  previewImport,
} from "../lib/api";
import { copy, formatMoney, nestedCopy } from "../lib/format";
import { createImportIntent } from "../lib/importIntent";
import { classifyCommitFailure } from "../lib/importOutcome";
import type { ImportOutcome } from "../lib/importOutcome";
import type { ImportPreview, PublicModel } from "../lib/types";
import { ImportOutcomePanel } from "./ImportOutcomePanel";

interface ImportWorkflowProps {
  model: PublicModel;
  onComplete: () => void;
}

export function ImportWorkflow({ model, onComplete }: ImportWorkflowProps) {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [intent] = useState(createImportIntent);
  const outcomeHeading = useRef<HTMLHeadingElement>(null);
  const canCommit = Boolean(
    preview && preview.validCount > 0 && preview.invalidCount === 0,
  );

  useEffect(() => {
    if (outcome) outcomeHeading.current?.focus();
  }, [outcome]);

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.type !== "text/csv" && !file.name.toLowerCase().endsWith(".csv")) {
      setError(copy(model, "invalidFile"));
      return;
    }
    if (file.size > model.csv.maximumBytes) {
      setError(nestedCopy(model, "importIssues", "payloadTooLarge"));
      return;
    }
    setError(null);
    setOutcome(null);
    setPreview(null);
    setFileName(file.name);
    setCsvText(await file.text());
  }

  async function showPreview() {
    setBusy("preview");
    setError(null);
    setOutcome(null);
    try {
      const nextPreview = await previewImport(model, csvText);
      setPreview(nextPreview);
      if (nextPreview.invalidCount) {
        setOutcome({
          kind: "needsCorrection",
          issues: nextPreview.invalidRows,
        });
      }
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : copy(model, "previewFailure"),
      );
    } finally {
      setBusy(null);
    }
  }

  async function commit() {
    if (!canCommit || !preview) return;
    setBusy("commit");
    setError(null);
    setOutcome((current) => (current?.kind === "awaiting" ? current : null));
    const key = intent.keyFor(csvText);
    try {
      const result = await commitImport(model, csvText, key);
      intent.discard();
      setOutcome({ kind: result.replayed ? "replayed" : "committed", result });
      onComplete();
      setPreview(null);
      setCsvText("");
      setFileName("");
    } catch (requestError) {
      const failure = classifyCommitFailure(requestError);
      if (failure.discardKey) {
        intent.discard();
        setPreview(null);
      }
      setOutcome(failure.outcome);
    } finally {
      setBusy(null);
    }
  }

  async function downloadCsvTemplate() {
    try {
      const response = await downloadTemplate(model);
      if (!response.ok) throw new Error(copy(model, "previewFailure"));
      const blob = await response.blob();
      saveDownload(blob, model.csv.sampleFileName);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : copy(model, "previewFailure"),
      );
    }
  }

  return (
    <div className="import-layout">
      <section className="panel import-panel">
        <div className="panel-heading-row">
          <div>
            <span className="section-kicker">{copy(model, "import")}</span>
            <h2>{copy(model, "importDescription")}</h2>
          </div>
          <a
            className="text-action"
            href="#csv-template"
            onClick={(event) => {
              event.preventDefault();
              void downloadCsvTemplate();
            }}
          >
            <Download size={15} aria-hidden="true" />
            {copy(model, "downloadTemplate")}
          </a>
        </div>
        <label className="drop-zone" htmlFor="wealthtrack-csv">
          <span className="drop-icon">
            <FileUp size={21} aria-hidden="true" />
          </span>
          <strong>{fileName || copy(model, "dropFile")}</strong>
          <small>
            {copy(model, "chooseFile")} · {model.csv.maximumRows} ·{" "}
            {Math.round(model.csv.maximumBytes / 1024)} KB
          </small>
          <input
            id="wealthtrack-csv"
            type="file"
            accept=".csv,text/csv"
            disabled={busy !== null}
            onChange={(event) => void readFile(event.target.files?.[0])}
          />
        </label>
        {error ? (
          <p className="notice" role="status">
            {error}
          </p>
        ) : null}
        {csvText ? (
          <p className="selected-file">
            <FileUp size={14} aria-hidden="true" />
            {copy(model, "selectedFile")}: {fileName}
          </p>
        ) : null}
        <div className="import-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              intent.discard();
              setCsvText("");
              setFileName("");
              setPreview(null);
              setError(null);
              setOutcome(null);
            }}
            disabled={!csvText || busy !== null}
          >
            <RotateCcw size={14} aria-hidden="true" />
            {copy(model, "cancelImport")}
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => void showPreview()}
            disabled={!csvText || busy !== null}
          >
            {busy === "preview" ? (
              <LoaderCircle className="spin" size={15} aria-hidden="true" />
            ) : (
              <Upload size={15} aria-hidden="true" />
            )}
            {busy === "preview"
              ? copy(model, "previewing")
              : copy(model, "previewImport")}
          </button>
        </div>
      </section>
      {outcome ? (
        <ImportOutcomePanel
          model={model}
          outcome={outcome}
          headingRef={outcomeHeading}
        />
      ) : null}
      {preview ? (
        <ImportPreviewPanel
          model={model}
          preview={preview}
          canCommit={canCommit}
          busy={busy}
          retrying={outcome?.kind === "awaiting"}
          onCommit={() => void commit()}
        />
      ) : null}
    </div>
  );
}

function ImportPreviewPanel({
  model,
  preview,
  canCommit,
  busy,
  retrying,
  onCommit,
}: {
  model: PublicModel;
  preview: ImportPreview;
  canCommit: boolean;
  busy: "preview" | "commit" | null;
  retrying: boolean;
  onCommit: () => void;
}) {
  return (
    <section className="panel preview-panel" aria-labelledby="preview-title">
      <div className="panel-heading-row">
        <div>
          <span className="section-kicker">{copy(model, "previewImport")}</span>
          <h2 id="preview-title">{copy(model, "previewTitle")}</h2>
          <p>{copy(model, "previewDescription")}</p>
        </div>
      </div>
      <div className="preview-summary">
        <div>
          <span>{copy(model, "validRows")}</span>
          <strong>{preview.validCount}</strong>
        </div>
        <div>
          <span>{copy(model, "invalidRows")}</span>
          <strong className={preview.invalidCount ? "is-negative" : ""}>
            {preview.invalidCount}
          </strong>
        </div>
        <div>
          <span>{copy(model, "importTotal")}</span>
          <strong>{formatMoney(model, preview.netAmountCents)}</strong>
        </div>
      </div>
      {preview.invalidCount === 0 ? (
        <p className="import-ready" role="status">
          {copy(model, "previewSuccess")}
        </p>
      ) : null}
      <button
        type="button"
        className="button button-primary"
        disabled={!canCommit || busy !== null}
        onClick={onCommit}
      >
        {busy === "commit" ? (
          <LoaderCircle className="spin" size={15} aria-hidden="true" />
        ) : (
          <Upload size={15} aria-hidden="true" />
        )}
        {busy === "commit"
          ? copy(model, "importing")
          : copy(model, retrying ? "importRetry" : "confirmImport")}
      </button>
    </section>
  );
}

function saveDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
