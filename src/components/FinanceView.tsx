import { ImportWorkflow } from "./ImportWorkflow";
import { BudgetsView, GoalsView, RecurringView } from "./PlansView";
import { OverviewView } from "./OverviewView";
import { TransactionsView } from "./TransactionsView";
import { copy } from "../lib/format";
import type { FinanceSnapshot } from "./FinanceData";
import type { PublicModel, WorkspaceView } from "../lib/types";

interface FinanceViewProps {
  model: PublicModel;
  view: WorkspaceView;
  snapshot: FinanceSnapshot | null;
  loading: boolean;
  error: string | null;
  search: string;
  category: string;
  accountId: string;
  onSearch: (value: string) => void;
  onCategory: (value: string) => void;
  onAccount: (value: string) => void;
  onRetry: () => void;
  onImportComplete: () => void;
}

export function FinanceView(props: FinanceViewProps) {
  if (!props.snapshot) {
    if (props.error) {
      return (
        <section className="error-panel" role="alert">
          <p>{props.error}</p>
          <button
            className="button button-secondary"
            type="button"
            onClick={props.onRetry}
          >
            {copy(props.model, "retry")}
          </button>
        </section>
      );
    }
    return (
      <div className="loading-state" role="status">
        <span className="loading-spinner" aria-hidden="true" />
        {copy(props.model, "loading")}
      </div>
    );
  }

  switch (props.view) {
    case "overview":
      return (
        <OverviewView model={props.model} summary={props.snapshot.summary} />
      );
    case "transactions":
      return (
        <TransactionsView
          model={props.model}
          transactions={props.snapshot.transactions}
          accounts={props.snapshot.accounts}
          search={props.search}
          category={props.category}
          accountId={props.accountId}
          loading={props.loading}
          onSearch={props.onSearch}
          onCategory={props.onCategory}
          onAccount={props.onAccount}
        />
      );
    case "budgets":
      return (
        <BudgetsView model={props.model} budgets={props.snapshot.budgets} />
      );
    case "goals":
      return <GoalsView model={props.model} goals={props.snapshot.goals} />;
    case "recurring":
      return (
        <RecurringView
          model={props.model}
          bills={props.snapshot.bills}
          accounts={props.snapshot.accounts}
        />
      );
    case "import":
      return (
        <ImportWorkflow
          model={props.model}
          onComplete={props.onImportComplete}
        />
      );
  }
}
