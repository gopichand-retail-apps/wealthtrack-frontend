import { Search } from "lucide-react";
import { copy, formatDate, formatMoney, nestedCopy } from "../lib/format";
import type { AccountSummary, PublicModel, Transaction } from "../lib/types";

interface TransactionsViewProps {
  model: PublicModel;
  transactions: Transaction[];
  accounts: AccountSummary[];
  search: string;
  category: string;
  accountId: string;
  loading: boolean;
  onSearch: (value: string) => void;
  onCategory: (value: string) => void;
  onAccount: (value: string) => void;
}

export function TransactionsView(props: TransactionsViewProps) {
  const accountNames = new Map(
    props.accounts.map((account) => [account.id, account.name]),
  );
  return (
    <section className="panel data-panel full-panel">
      <div className="panel-heading-row">
        <div>
          <h2>{copy(props.model, "latestTransactions")}</h2>
          <p>{copy(props.model, "transactionsDescription")}</p>
        </div>
        <span className="result-count">
          {props.transactions.length} {copy(props.model, "transactionCount")}
        </span>
      </div>
      <div className="table-tools">
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">
            {copy(props.model, "searchTransactions")}
          </span>
          <input
            type="search"
            value={props.search}
            placeholder={copy(props.model, "searchPlaceholder")}
            onChange={(event) => props.onSearch(event.target.value)}
          />
        </label>
        <label className="sort-field">
          <span>{copy(props.model, "filterCategory")}</span>
          <select
            value={props.category}
            onChange={(event) => props.onCategory(event.target.value)}
          >
            <option value="">{copy(props.model, "allCategories")}</option>
            {props.model.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {nestedCopy(props.model, "categories", category.id)}
              </option>
            ))}
          </select>
        </label>
        <label className="sort-field">
          <span>{copy(props.model, "account")}</span>
          <select
            value={props.accountId}
            onChange={(event) => props.onAccount(event.target.value)}
          >
            <option value="">{copy(props.model, "allAccounts")}</option>
            {props.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {props.loading ? (
        <p className="loading-inline" role="status">
          {copy(props.model, "loading")}
        </p>
      ) : null}
      {!props.loading && !props.transactions.length ? (
        <p className="empty-state">{copy(props.model, "noTransactions")}</p>
      ) : null}
      {props.transactions.length ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>{copy(props.model, "date")}</th>
                <th>{copy(props.model, "description")}</th>
                <th>{copy(props.model, "category")}</th>
                <th>{copy(props.model, "account")}</th>
                <th>{copy(props.model, "amount")}</th>
              </tr>
            </thead>
            <tbody>
              {props.transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{formatDate(props.model, transaction.date)}</td>
                  <td className="transaction-description">
                    {transaction.description}
                  </td>
                  <td>
                    {nestedCopy(
                      props.model,
                      "categories",
                      transaction.category,
                    )}
                  </td>
                  <td>
                    {accountNames.get(transaction.accountId) ??
                      transaction.accountId}
                  </td>
                  <td
                    className={
                      transaction.amountCents >= 0
                        ? "amount-positive"
                        : "amount-negative"
                    }
                  >
                    {formatMoney(props.model, transaction.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
