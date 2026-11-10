import { useEffect, useState } from "react";
import { loadModel } from "../lib/api";
import type { PublicModel } from "../lib/types";
import { FinanceWorkspace } from "./FinanceWorkspace";

export function WealthTrackApp() {
  const [model, setModel] = useState<PublicModel | null>(null);
  const [failed, setFailed] = useState(false);
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const updateOffline = () => setOffline(!navigator.onLine);
    window.addEventListener("online", updateOffline);
    window.addEventListener("offline", updateOffline);
    return () => {
      window.removeEventListener("online", updateOffline);
      window.removeEventListener("offline", updateOffline);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadModel(controller.signal)
      .then((loadedModel) => {
        updateDocumentMetadata(loadedModel);
        setModel(loadedModel);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  if (!model) {
    return (
      <main className="boot-state" role={failed ? "alert" : "status"}>
        {failed ? (
          <code>CONTENT_MODEL_UNAVAILABLE</code>
        ) : (
          <span className="loading-spinner" aria-hidden="true" />
        )}
      </main>
    );
  }
  return <FinanceWorkspace model={model} offline={offline} />;
}

function updateDocumentMetadata(model: PublicModel) {
  document.title = `${model.app.name} | ${model.app.descriptor}`;
  document.documentElement.lang = model.app.locale.split("-")[0];
  let description = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );
  if (!description) {
    description = document.createElement("meta");
    description.name = "description";
    document.head.append(description);
  }
  description.content = model.app.description;
}
