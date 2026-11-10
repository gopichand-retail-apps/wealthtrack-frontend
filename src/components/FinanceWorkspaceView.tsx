import { RefreshCw, WifiOff } from "lucide-react";
import {
  FinancePageHeading,
  FinanceSidebar,
  FinanceTopbar,
  ReportFilters,
} from "./FinanceChrome";
import { FinanceView } from "./FinanceView";
import { copy } from "../lib/format";
import type { useFinanceWorkspace } from "../hooks/useFinanceWorkspace";

type FinanceWorkspaceController = ReturnType<typeof useFinanceWorkspace>;

export function FinanceWorkspaceView({
  controller,
}: {
  controller: FinanceWorkspaceController;
}) {
  return (
    <div
      className="finance-shell"
      data-theme={controller.theme}
      data-mode={controller.isMockMode}
    >
      <FinanceSidebar
        model={controller.model}
        activeView={controller.activeView}
        mobileOpen={controller.mobileOpen}
        onNavigate={(view) => {
          controller.setActiveView(view);
          controller.setMobileOpen(false);
        }}
        onClose={() => controller.setMobileOpen(false)}
      />
      <main className="finance-main">
        <FinanceTopbar
          model={controller.model}
          activeView={controller.activeView}
          connected={!controller.offline && controller.query.snapshot !== null}
          offline={controller.offline}
          theme={controller.theme}
          mobileOpen={controller.mobileOpen}
          onToggleTheme={controller.toggleTheme}
          onToggleNavigation={controller.toggleNavigation}
        />
        <section className="finance-content">
          <FinancePageHeading
            model={controller.model}
            activeView={controller.activeView}
            description={controller.pageDescription}
            onRefresh={controller.refresh}
            onExport={() => void controller.exportCurrentTransactions()}
            onImport={controller.openImport}
          />
          {controller.offline ? (
            <div className="offline-notice" role="status">
              <WifiOff size={17} aria-hidden="true" />
              <span>{copy(controller.model, "offlineNotice")}</span>
              <button
                className="button button-secondary"
                type="button"
                onClick={controller.refresh}
              >
                <RefreshCw size={14} aria-hidden="true" />
                {copy(controller.model, "retry")}
              </button>
            </div>
          ) : null}
          <ReportFilters
            model={controller.model}
            periodId={controller.periodId}
            accountId={controller.accountId}
            category={controller.category}
            onPeriod={controller.setPeriodId}
            onAccount={controller.setAccountId}
            onCategory={controller.setCategory}
            accounts={controller.query.snapshot?.accounts ?? []}
          />
          {controller.notice ? (
            <p className="notice" role="status">
              {controller.notice}
            </p>
          ) : null}
          <section
            className="active-view"
            aria-label={copy(controller.model, controller.activeView)}
            aria-busy={controller.query.loading}
          >
            <FinanceView
              model={controller.model}
              view={controller.activeView}
              snapshot={controller.query.snapshot}
              loading={controller.query.loading}
              error={controller.query.error}
              search={controller.search}
              category={controller.category}
              accountId={controller.accountId}
              onSearch={controller.setSearch}
              onCategory={controller.setCategory}
              onAccount={controller.setAccountId}
              onRetry={controller.refresh}
              onImportComplete={controller.refresh}
            />
          </section>
        </section>
      </main>
    </div>
  );
}
