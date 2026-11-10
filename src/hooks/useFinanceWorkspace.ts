import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { isMock } from "../config";
import { getTransactions, ApiError } from "../lib/api";
import { createTransactionsCsv } from "../lib/csv";
import { copy } from "../lib/format";
import type { PublicModel, ThemeMode, WorkspaceView } from "../lib/types";
import { useFinanceData } from "../components/FinanceData";

export function useFinanceWorkspace(model: PublicModel, offline: boolean) {
  const filters = useFinanceFilters(model);
  const [theme, setTheme] = useState(() => readThemePreference(model));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const wasOffline = useRef(offline);
  const query = useFinanceData(
    model,
    filters.period.days,
    {
      category: filters.category || undefined,
      accountId: filters.accountId || undefined,
      search: filters.search || undefined,
    },
    filters.revision,
  );
  useEffect(() => {
    window.localStorage.setItem(model.app.themeStorageKey, theme);
  }, [model.app.themeStorageKey, theme]);
  useEffect(
    () => refreshAfterReconnect(offline, wasOffline, filters.setRevision),
    [offline, filters.setRevision],
  );
  const exportCurrentTransactions = useTransactionExport({
    model,
    days: filters.period.days,
    category: filters.category,
    accountId: filters.accountId,
    setNotice,
  });
  const refresh = () => filters.setRevision((value) => value + 1);
  const toggleTheme = () =>
    setTheme((value) => (value === "light" ? "dark" : "light"));
  const toggleNavigation = () => setMobileOpen((open) => !open);
  const openImport = () => filters.setActiveView("import");

  return {
    model,
    isMockMode: isMock ? "mock" : "live",
    offline,
    query,
    ...filters,
    theme,
    setTheme,
    mobileOpen,
    setMobileOpen,
    toggleTheme,
    toggleNavigation,
    refresh,
    openImport,
    notice,
    exportCurrentTransactions,
    pageDescription: copy(model, `${filters.activeView}Description`),
  };
}

function useFinanceFilters(model: PublicModel) {
  const defaultPeriod =
    model.periods.find(
      (period) => period.id === model.filters.defaultPeriodId,
    ) ?? model.periods[0];
  if (!defaultPeriod)
    throw new Error("The content model requires a reporting period.");
  const [activeView, setActiveView] = useState<WorkspaceView>("overview");
  const [periodId, setPeriodId] = useState(defaultPeriod.id);
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const period =
    model.periods.find((item) => item.id === periodId) ?? defaultPeriod;
  return {
    activeView,
    setActiveView,
    period,
    periodId,
    setPeriodId,
    category,
    setCategory,
    accountId,
    setAccountId,
    search,
    setSearch,
    revision,
    setRevision,
  };
}

function refreshAfterReconnect(
  offline: boolean,
  previousOffline: MutableRefObject<boolean>,
  setRevision: Dispatch<SetStateAction<number>>,
) {
  if (previousOffline.current && !offline) {
    setRevision((value) => value + 1);
  }
  previousOffline.current = offline;
}

function useTransactionExport({
  model,
  days,
  category,
  accountId,
  setNotice,
}: {
  model: PublicModel;
  days: number;
  category: string;
  accountId: string;
  setNotice: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  return async function exportCurrentTransactions() {
    try {
      const transactions = await getTransactions(model, {
        days,
        category: category || undefined,
        accountId: accountId || undefined,
        limit: 500,
      });
      downloadTransactions(model, transactions);
      setNotice(copy(model, "exportReady"));
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? error.message
          : copy(model, "exportFailure"),
      );
    }
  };
}

function downloadTransactions(
  model: PublicModel,
  transactions: Parameters<typeof createTransactionsCsv>[1],
) {
  const csv = createTransactionsCsv(model, transactions);
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = model.csv.sampleFileName.replace(".csv", "-export.csv");
  anchor.click();
  URL.revokeObjectURL(url);
}

function readThemePreference(model: PublicModel): ThemeMode {
  const preference = window.localStorage.getItem(model.app.themeStorageKey);
  return preference === "dark" || preference === "light"
    ? preference
    : model.app.defaultTheme;
}
