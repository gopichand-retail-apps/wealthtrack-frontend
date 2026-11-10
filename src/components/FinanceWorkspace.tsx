import { FinanceWorkspaceView } from "./FinanceWorkspaceView";
import { useFinanceWorkspace } from "../hooks/useFinanceWorkspace";
import type { PublicModel } from "../lib/types";

export function FinanceWorkspace({
  model,
  offline,
}: {
  model: PublicModel;
  offline: boolean;
}) {
  const controller = useFinanceWorkspace(model, offline);
  return <FinanceWorkspaceView controller={controller} />;
}
