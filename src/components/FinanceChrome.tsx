import {
  ArrowLeftRight,
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  Download,
  FileUp,
  Flag,
  LayoutDashboard,
  Menu,
  Moon,
  RefreshCw,
  Sun,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { copy, nestedCopy } from "../lib/format";
import { APP_VERSION } from "../app-version";
import type { PublicModel, ThemeMode, WorkspaceView } from "../lib/types";

const navigationIcons = new Map<string, LucideIcon>([
  ["LayoutDashboard", LayoutDashboard],
  ["ArrowLeftRight", ArrowLeftRight],
  ["ChartNoAxesColumnIncreasing", ChartNoAxesColumnIncreasing],
  ["Flag", Flag],
  ["CalendarClock", CalendarClock],
  ["FileUp", FileUp],
]);

export function FinanceSidebar({
  model,
  activeView,
  mobileOpen,
  onNavigate,
  onClose,
}: {
  model: PublicModel;
  activeView: WorkspaceView;
  mobileOpen: boolean;
  onNavigate: (view: WorkspaceView) => void;
  onClose: () => void;
}) {
  return (
    <>
      {mobileOpen ? (
        <button
          className="navigation-scrim"
          type="button"
          aria-label={copy(model, "closeNavigation")}
          onClick={onClose}
        />
      ) : null}
      <aside
        className={mobileOpen ? "finance-sidebar is-open" : "finance-sidebar"}
      >
        <a
          className="finance-brand"
          href="#overview"
          onClick={() => onNavigate("overview")}
        >
          <span className="finance-brand-mark">
            <Wallet size={19} aria-hidden="true" />
          </span>
          <span>{model.app.name}</span>
        </a>
        <div className="sidebar-workspace">
          <span>{copy(model, "workspace")}</span>
          <strong>{copy(model, "profileRole")}</strong>
        </div>
        <nav
          className="finance-navigation"
          aria-label={copy(model, "primaryNavigation")}
        >
          {model.navigation.map((item) => (
            <button
              type="button"
              key={item.id}
              className={
                activeView === item.id
                  ? "finance-nav-link is-active"
                  : "finance-nav-link"
              }
              aria-current={activeView === item.id ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <NavigationIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-profile">
          <span className="profile-avatar">
            {copy(model, "profileInitials")}
          </span>
          <span>
            <small>
              {copy(model, "appVersionLabel")} {APP_VERSION}
            </small>
            <strong>{copy(model, "profileName")}</strong>
            <small>{copy(model, "profileRole")}</small>
          </span>
        </div>
      </aside>
    </>
  );
}

export function FinanceTopbar({
  model,
  activeView,
  connected,
  offline,
  theme,
  mobileOpen,
  onToggleTheme,
  onToggleNavigation,
}: {
  model: PublicModel;
  activeView: WorkspaceView;
  connected: boolean;
  offline: boolean;
  theme: ThemeMode;
  mobileOpen: boolean;
  onToggleTheme: () => void;
  onToggleNavigation: () => void;
}) {
  const ThemeIcon = theme === "light" ? Moon : Sun;
  const connectionCopy = offline
    ? "deviceOffline"
    : connected
      ? "serviceConnected"
      : "serviceUnavailable";
  const connectionClass = offline
    ? "service-badge is-offline"
    : connected
      ? "service-badge is-connected"
      : "service-badge";
  return (
    <header className="finance-topbar">
      <button
        className="icon-button mobile-menu-toggle"
        type="button"
        aria-label={copy(
          model,
          mobileOpen ? "closeNavigation" : "openNavigation",
        )}
        onClick={onToggleNavigation}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      <div className="topbar-breadcrumb">
        <span>{copy(model, "workspace")}</span>
        <strong>{copy(model, activeView)}</strong>
      </div>
      <div className="topbar-actions">
        <span className={connectionClass}>
          <span />
          {copy(model, connectionCopy)}
        </span>
        <button
          className="icon-button"
          type="button"
          aria-label={copy(model, "themeToggle")}
          onClick={onToggleTheme}
        >
          <ThemeIcon size={17} />
        </button>
      </div>
    </header>
  );
}

export function FinancePageHeading({
  model,
  activeView,
  description,
  onRefresh,
  onExport,
  onImport,
}: {
  model: PublicModel;
  activeView: WorkspaceView;
  description: string;
  onRefresh: () => void;
  onExport: () => void;
  onImport: () => void;
}) {
  return (
    <div className="page-heading-row">
      <div>
        <span className="page-eyebrow">
          {copy(model, "greeting")}, {copy(model, "profileName")}
        </span>
        <h1>{copy(model, activeView)}</h1>
        <p>{description}</p>
      </div>
      <div className="page-actions">
        <button
          className="icon-button"
          type="button"
          aria-label={copy(model, "refreshData")}
          onClick={onRefresh}
        >
          <RefreshCw size={16} />
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={onExport}
        >
          <Download size={15} />
          {copy(model, "export")}
        </button>
        <button
          className="button button-primary"
          type="button"
          onClick={onImport}
        >
          <Upload size={15} />
          {copy(model, "import")}
        </button>
      </div>
    </div>
  );
}

export function ReportFilters({
  model,
  periodId,
  accountId,
  category,
  onPeriod,
  onAccount,
  onCategory,
  accounts,
}: {
  model: PublicModel;
  periodId: string;
  accountId: string;
  category: string;
  onPeriod: (value: string) => void;
  onAccount: (value: string) => void;
  onCategory: (value: string) => void;
  accounts: Array<{ id: string; name: string }>;
}) {
  return (
    <section
      className="report-filters"
      aria-label={copy(model, "reportingPeriod")}
    >
      <label>
        <span>{copy(model, "reportingPeriod")}</span>
        <select
          value={periodId}
          onChange={(event) => onPeriod(event.target.value)}
        >
          {model.periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{copy(model, "filterCategory")}</span>
        <select
          value={category}
          onChange={(event) => onCategory(event.target.value)}
        >
          <option value="">{copy(model, "allCategories")}</option>
          {model.categories.map((item) => (
            <option key={item.id} value={item.id}>
              {nestedCopy(model, "categories", item.id)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{copy(model, "account")}</span>
        <select
          value={accountId}
          onChange={(event) => onAccount(event.target.value)}
        >
          <option value="">{copy(model, "allAccounts")}</option>
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function NavigationIcon({ name }: { name: string }) {
  const Icon = navigationIcons.get(name) ?? Wallet;
  return <Icon size={17} aria-hidden="true" />;
}
