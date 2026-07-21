import { useMemo, useState } from "react";
import { formatCurrency } from "./SummaryDashboard.jsx";

const views = [
  { id: "ALL", label: "All" },
  { id: "INFLOWS", label: "Inflows" },
  { id: "EXPENSES", label: "Expenses" },
  { id: "RECURRING", label: "Recurring" },
];

const statusDetails = {
  PAID: { icon: "✅", label: "Paid", className: "paid" },
  PENDING: { icon: "⏳", label: "Pending", className: "pending" },
  "ON HOLD": { icon: "⏸️", label: "On Hold", className: "hold" },
};

function parseLocalDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDate(dateString) {
  const date = parseLocalDate(dateString);
  return date
    ? date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date unavailable";
}

function formatRecurringDueDate(expense) {
  const date = parseLocalDate(expense.dueDate || expense.date);
  return date
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : `Day ${expense.recurringDay || "—"}`;
}

function InflowCard({ inflow, onEdit, onDelete }) {
  return (
    <article className="transaction-card inflow-card">
      <div className="transaction-icon" aria-hidden="true">💰</div>
      <div className="transaction-info">
        <h3>{inflow.desc || "Income"}</h3>
        <p>📅 {formatDate(inflow.date)}</p>
      </div>
      <div className="transaction-value">
        <strong>+{formatCurrency(inflow.amount)}</strong>
        <span className="status-badge income">Income</span>
      </div>
      <div className="transaction-actions">
        <button type="button" onClick={() => onEdit(inflow)} aria-label={`Edit ${inflow.desc || "inflow"}`}>✎</button>
        <button type="button" onClick={() => onDelete(inflow)} aria-label={`Delete ${inflow.desc || "inflow"}`}>⌫</button>
      </div>
    </article>
  );
}

function ExpenseCard({ expense, statusBusy, onStatusChange, onEdit, onDelete }) {
  const status = statusDetails[expense.status] || statusDetails["ON HOLD"];

  return (
    <article className={`transaction-card expense-card ${status.className}`}>
      <div className="transaction-icon" aria-hidden="true">{status.icon}</div>
      <div className="transaction-info">
        <h3>{expense.desc || "Expense"}</h3>
        <p>📅 {formatDate(expense.date)}</p>
        {expense.recurring && (
          <span className="recurring-badge">
            <span className="recurring-symbol" aria-hidden="true">↻</span>
            Due {formatRecurringDueDate(expense)}
          </span>
        )}
      </div>
      <div className="transaction-value">
        <strong>-{formatCurrency(expense.amount)}</strong>
        <select
          className={`expense-status-select ${status.className}`}
          value={expense.status || "ON HOLD"}
          disabled={statusBusy === expense.id}
          onChange={(event) => onStatusChange(expense, event.target.value)}
          aria-label={`Status for ${expense.desc || "expense"}`}
        >
          <option value="ON HOLD">On Hold</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
        </select>
      </div>
      {!expense.recurring && (
        <div className="transaction-actions">
          <button type="button" onClick={() => onEdit(expense)} aria-label={`Edit ${expense.desc || "expense"}`}>✎</button>
          <button type="button" onClick={() => onDelete(expense)} aria-label={`Delete ${expense.desc || "expense"}`}>⌫</button>
        </div>
      )}
    </article>
  );
}

function EmptyState({ view }) {
  const messages = {
    ALL: ["No activity this month", "Your income and expenses will appear here."],
    INFLOWS: ["No inflows this month", "Income records for the selected month will appear here."],
    EXPENSES: ["No regular expenses", "Non-recurring expenses for this month will appear here."],
    RECURRING: ["No recurring expenses", "Generated recurring expenses for this month will appear here."],
  };
  const [title, text] = messages[view];

  return (
    <div className="transaction-empty">
      <span aria-hidden="true">🧾</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function TransactionsSection({ inflows, expenses, onEditInflow, onDeleteInflow, onEditExpense, onDeleteExpense, onExpenseStatusChange, statusBusy }) {
  const [view, setView] = useState("ALL");

  const displayedInflows = view === "ALL" || view === "INFLOWS" ? inflows : [];
  const displayedExpenses = useMemo(() => {
    if (view === "INFLOWS") return [];
    if (view === "EXPENSES") return expenses.filter((item) => !item.recurring);
    if (view === "RECURRING") {
      return expenses
        .filter((item) => item.recurring)
        .sort(
          (a, b) =>
            String(b.dueDate || b.date || "").localeCompare(
              String(a.dueDate || a.date || ""),
            ),
        );
    }
    return expenses;
  }, [expenses, view]);

  const isEmpty = displayedInflows.length === 0 && displayedExpenses.length === 0;

  return (
    <section className="transactions-section" aria-labelledby="transactions-title">
      <div className="transactions-heading">
        <div>
          <p className="eyebrow">Monthly activity</p>
          <h2 id="transactions-title">Income and expenses</h2>
        </div>
        <span>{displayedInflows.length + displayedExpenses.length} records</span>
      </div>

      <div className="view-tabs" role="tablist" aria-label="Transaction view">
        {views.map((item) => (
          <button
            key={item.id}
            className={view === item.id ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={view === item.id}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isEmpty ? (
        <EmptyState view={view} />
      ) : (
        <div className="transaction-groups">
          {displayedInflows.length > 0 && (
            <section className="transaction-group" aria-labelledby="inflows-title">
              <div className="group-heading">
                <h3 id="inflows-title">Inflows</h3>
                <span>{displayedInflows.length}</span>
              </div>
              <div className="transaction-list">
                {displayedInflows.map((inflow) => <InflowCard inflow={inflow} key={inflow.id} onEdit={onEditInflow} onDelete={onDeleteInflow} />)}
              </div>
            </section>
          )}

          {displayedExpenses.length > 0 && (
            <section className="transaction-group" aria-labelledby="expenses-title">
              <div className="group-heading">
                <h3 id="expenses-title">{view === "RECURRING" ? "Recurring expenses" : "Expenses"}</h3>
                <span>{displayedExpenses.length}</span>
              </div>
              <div className="transaction-list">
                {displayedExpenses.map((expense) => <ExpenseCard expense={expense} key={expense.id} statusBusy={statusBusy} onStatusChange={onExpenseStatusChange} onEdit={onEditExpense} onDelete={onDeleteExpense} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}

export default TransactionsSection;
