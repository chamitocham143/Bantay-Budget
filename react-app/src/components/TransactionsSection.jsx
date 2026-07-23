import { useEffect, useMemo, useRef, useState } from "react";
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


function getTransactionDate(transaction) {
  return transaction.dueDate || transaction.date || "";
}

function getDateGroupLabel(dateString) {
  const date = parseLocalDate(dateString);

  if (!date) return "Date unavailable";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const transactionDate = new Date(date);
  transactionDate.setHours(0, 0, 0, 0);

  if (transactionDate.getTime() === today.getTime()) {
    return `Today • ${formatDate(dateString)}`;
  }

  if (transactionDate.getTime() === yesterday.getTime()) {
    return `Yesterday • ${formatDate(dateString)}`;
  }

  return formatDate(dateString);
}

function getTransactionIcon(transaction) {
  if (transaction.type === "INFLOW") return "💰";
  //if (transaction.recurring) return "↻";

  const text = String(transaction.desc || "").toLowerCase();

  if (
    text.includes("gas") ||
    text.includes("fuel") ||
    text.includes("shell") ||
    text.includes("chevron")
  ) {
    return "⛽";
  }

  if (
    text.includes("rent") ||
    text.includes("mortgage") ||
    text.includes("house")
  ) {
    return "🏠";
  }

  if (
    text.includes("bank") ||
    text.includes("loan") ||
    text.includes("insurance")
  ) {
    return "🏦";
  }

  if (
    text.includes("food") ||
    text.includes("seafood city") ||
    text.includes("el super") ||
    text.includes("albertson") ||
    text.includes("albertsons") ||
    text.includes("walmart") ||
    text.includes("restaurant") ||
    text.includes("grocery") ||
    text.includes("costco")
  ) {
    return "🛒";
  }

  if (
    text.includes("phone") ||
    text.includes("verizon") ||
    text.includes("internet") ||
    text.includes("electric")
  ) {
    return "📱";
  }

  if (
    text.includes("apple") ||
    text.includes("best buy") ||
    text.includes("living spaces") ||
    text.includes("mission lane") ||
    text.includes("first premier") ||
    text.includes("capital one")
  ) {
    return "💳";
  }

  if (
    text.includes("netflix") ||
    text.includes("spotify") ||
    text.includes("movie")
  ) {
    return "🎬";
  }

  return "🧾";
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

function ExpenseCard({ expense, statusBusy, canManageRecurring, onStatusChange, onEdit, onDelete, onEditGenerated, onDeleteGenerated }) {
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
      {(!expense.recurring || canManageRecurring) && (
        <div className="transaction-actions">
          <button type="button" onClick={() => expense.recurring ? onEditGenerated(expense) : onEdit(expense)} aria-label={`Edit ${expense.desc || "expense"}`}>✎</button>
          <button type="button" onClick={() => expense.recurring ? onDeleteGenerated(expense) : onDelete(expense)} aria-label={`Delete ${expense.desc || "expense"}`}>⌫</button>
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

function SwipeableTransactionRow({
  rowId,
  isOpen,
  onOpen,
  onClose,
  onEdit,
  onDelete,
  children,
}) {
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const draggingRef = useRef(false);
  const horizontalSwipeRef = useRef(false);

  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const [view, setView] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [openRowId, setOpenRowId] = useState(null);

  const ACTION_WIDTH = 144;

  function handlePointerDown(event) {
    if (
      event.target.closest(
        "button, select, option, input, textarea, a",
      )
    ) {
      return;
    }

    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    draggingRef.current = true;
    horizontalSwipeRef.current = false;

    
  }

 function handlePointerMove(event) {
  if (!draggingRef.current) return;

  const deltaX = event.clientX - startXRef.current;
  const deltaY = event.clientY - startYRef.current;

  if (!horizontalSwipeRef.current) {
    // Treat the gesture as vertical scrolling.
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    if (Math.abs(deltaX) > 6) {
      horizontalSwipeRef.current = true;
      setIsSwiping(true);

      event.currentTarget.setPointerCapture?.(
        event.pointerId
      );
    }
  }

  if (!horizontalSwipeRef.current) return;

  const offset = isOpen
    ? Math.max(0, Math.min(ACTION_WIDTH, deltaX))
    : Math.max(-ACTION_WIDTH, Math.min(0, deltaX));

  setDragOffset(offset);
}

  function handlePointerEnd(event) {
  if (!draggingRef.current) return;

  draggingRef.current = false;

  if (
  event.currentTarget.hasPointerCapture?.(event.pointerId)
) {
  event.currentTarget.releasePointerCapture?.(
    event.pointerId
  );
}

  if (!horizontalSwipeRef.current) {
    setDragOffset(0);
    return;
  }

  if (isOpen) {
    // A right swipe closes the already-open row.
    if (dragOffset > ACTION_WIDTH / 3) {
      onClose();
    } else {
      onOpen(rowId);
    }
  } else {
    // A left swipe opens the closed row.
    if (dragOffset < -ACTION_WIDTH / 3) {
      onOpen(rowId);
    } else {
      onClose();
    }
  }

  setDragOffset(0);
  setIsSwiping(false);
  horizontalSwipeRef.current = false;
}

      let translateX;

    if (draggingRef.current) {
      translateX = isOpen
        ? -ACTION_WIDTH + dragOffset
        : dragOffset;
    } else {
      translateX = isOpen ? -ACTION_WIDTH : 0;
    }

  return (
    <div className="swipe-transaction">
      <div
        className={`swipe-actions ${
          isOpen || isSwiping ? "is-visible" : ""
        }`}
        aria-hidden={!isOpen && !isSwiping}
      >
        <button
          type="button"
          className="swipe-edit"
          onClick={() => {
            onClose();
            onEdit();
          }}
        >
          <span aria-hidden="true">✎</span>
          Edit
        </button>

        <button
          type="button"
          className="swipe-delete"
          onClick={() => {
            onClose();
            onDelete();
          }}
        >
          <span aria-hidden="true">⌫</span>
          Delete
        </button>
      </div>

      <div
        className={`swipe-foreground ${
          isOpen ? "is-open" : ""
        } ${isSwiping ? "is-swiping" : ""}`}
        style={{
          transform: `translate3d(${translateX}px, 0, 0)`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {children}
      </div>
    </div>
  );
}

function TransactionsSection({ inflows, expenses, selectedMonth, currentMonth, onEditInflow, onDeleteInflow, onEditExpense, onDeleteExpense, onEditGeneratedExpense, onDeleteGeneratedExpense, onExpenseStatusChange, statusBusy }) {
  const [view, setView] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [openRowId, setOpenRowId] = useState(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  useEffect(() => {
  setShowAllTransactions(false);
  setOpenRowId(null);
}, [view, normalizedSearch, selectedMonth]);

  const displayedInflows =
  view === "ALL" || view === "INFLOWS"
    ? inflows.filter((item) =>
        String(item.desc || "").toLowerCase().includes(normalizedSearch),
      )
    : [];

  const displayedExpenses = useMemo(() => {
  let result = expenses;
  if (view === "INFLOWS") return [];
  if (view === "EXPENSES") {
    result = result.filter((item) => !item.recurring);
  }
  if (view === "RECURRING") {
    result = result.filter((item) => item.recurring);
  }
  if (normalizedSearch) {
    result = result.filter((item) =>
      String(item.desc || "").toLowerCase().includes(normalizedSearch),
    );
  }
  return result;
}, [expenses, normalizedSearch, view]);

const timelineTransactions = useMemo(() => {
  const combined = [
    ...displayedInflows.map((item) => ({
      ...item,
      type: "INFLOW",
    })),
    ...displayedExpenses.map((item) => ({
      ...item,
      type: "EXPENSE",
    })),
  ];

  return combined.sort((a, b) =>
    String(getTransactionDate(b)).localeCompare(
      String(getTransactionDate(a)),
    ),
  );
}, [displayedInflows, displayedExpenses]);

const visibleTransactions = useMemo(() => {
  if (showAllTransactions) {
    return timelineTransactions;
  }

  return timelineTransactions.slice(0, 5);
}, [timelineTransactions, showAllTransactions]);

const hasAdditionalTransactions =
  timelineTransactions.length > 5;

const groupedTransactions = useMemo(() => {
  return visibleTransactions.reduce(
    (groups, transaction) => {
      const date = getTransactionDate(transaction);
      const key = date || "unknown";

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(transaction);

      return groups;
    },
    {}
  );
}, [visibleTransactions]);


  const isEmpty = timelineTransactions.length === 0;

  return (
    <section
  className="transactions-section premium-transactions"
  aria-labelledby="transactions-title"
>
  <div className="transactions-heading">
    <div>
      <p className="eyebrow">Transactions</p>
      <h2 id="transactions-title">Income and expenses</h2>
    </div>

    <span className="records-count">
      {timelineTransactions.length} records
    </span>
  </div>

  <div className="transactions-search">
    <span className="search-icon" aria-hidden="true">
  🔍
</span>

    <input
      type="search"
      value={searchTerm}
      onChange={(event) => setSearchTerm(event.target.value)}
      placeholder="Search transactions..."
      aria-label="Search transactions"
    />

    {searchTerm && (
      <button
        type="button"
        onClick={() => setSearchTerm("")}
        aria-label="Clear transaction search"
      >
        ×
      </button>
    )}
  </div>

  <div className="view-tabs premium-view-tabs" role="tablist">
    {views.map((item) => (
      <button
        key={item.id}
        className={view === item.id ? "active" : ""}
        type="button"
        role="tab"
        aria-selected={view === item.id}
        onClick={() => setView(item.id)}
      >
        <span aria-hidden="true">
          {item.id === "ALL" && "▦"}
          {item.id === "INFLOWS" && "↓"}
          {item.id === "EXPENSES" && "↑"}
          {item.id === "RECURRING" && "↻"}
        </span>

        {item.label}
      </button>
    ))}
  </div>

  {isEmpty ? (
    <EmptyState view={view} />
  ) : (
    <div className="transaction-timeline">
      {Object.entries(groupedTransactions).map(
        ([date, transactions]) => (
          <section className="timeline-group" key={date}>
            <div className="timeline-heading">
              <h3>{getDateGroupLabel(date)}</h3>
              <span>{transactions.length}</span>
            </div>

            <div className="timeline-card">

              {transactions.map((transaction) => {
                const isInflow = transaction.type === "INFLOW";
                const status = isInflow
                  ? null
                  : statusDetails[transaction.status] ||
                    statusDetails["ON HOLD"];

                    const rowId = `${transaction.type}-${transaction.id}`;

                  const handleEdit = () => {
                    if (isInflow) {
                      onEditInflow(transaction);
                      return;
                    }

                    transaction.recurring
                      ? onEditGeneratedExpense(transaction)
                      : onEditExpense(transaction);
                  };

                  const handleDelete = () => {
                    if (isInflow) {
                      onDeleteInflow(transaction);
                      return;
                    }

                    transaction.recurring
                      ? onDeleteGeneratedExpense(transaction)
                      : onDeleteExpense(transaction);
                  };

                return (

                  <SwipeableTransactionRow
    key={rowId}
    rowId={rowId}
    isOpen={openRowId === rowId}
    onOpen={setOpenRowId}
    onClose={() => setOpenRowId(null)}
    onEdit={handleEdit}
    onDelete={handleDelete}
  >

                  <article
                    className={`timeline-row ${
                      isInflow ? "timeline-inflow" : "timeline-expense"
                    }`}
                    key={`${transaction.type}-${transaction.id}`}
                  >
                    <div
                      className={`timeline-icon ${
                        isInflow
                          ? "income"
                          : transaction.recurring
                            ? "recurring"
                            : status.className
                      }`}
                      aria-hidden="true"
                    >
                      {getTransactionIcon(transaction)}
                    </div>

                    <div className="timeline-info">
                      <h4>{transaction.desc || transaction.type}</h4>

                      {isInflow ? (
                        <span className="timeline-status income">
                          Income
                        </span>
                      ) : (
                        <select
                          className={`timeline-status-select ${status.className}`}
                          value={transaction.status || "ON HOLD"}
                          disabled={statusBusy === transaction.id}
                          onChange={(event) =>
                            onExpenseStatusChange(
                              transaction,
                              event.target.value,
                            )
                          }
                          aria-label={`Status for ${
                            transaction.desc || "expense"
                          }`}
                        >
                          <option value="ON HOLD">On Hold</option>
                          <option value="PENDING">Pending</option>
                          <option value="PAID">Paid</option>
                        </select>
                      )}

                      {transaction.recurring && (
                        <span className="timeline-due">
                          🔄 Due {formatRecurringDueDate(transaction)}
                        </span>
                      )}
                    </div>

                    <div className="timeline-value">
                      <strong
                        className={
                          isInflow
                            ? "timeline-amount income"
                            : "timeline-amount expense"
                        }
                      >
                        {isInflow ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </strong>

                    </div>
                  </article>
                  </SwipeableTransactionRow>
                );
              })}
            </div>
          </section>
        ),
      )}

        {hasAdditionalTransactions && (
  <button
    className="transactions-expand-button"
    type="button"
    aria-expanded={showAllTransactions}
    onClick={() => {
      setOpenRowId(null);

      setShowAllTransactions(
        (currentValue) => !currentValue
      );
    }}
  >
    <span>
      {showAllTransactions
        ? "Show Less"
        : `See All ${timelineTransactions.length} Transactions`}
    </span>

    <i aria-hidden="true">
      {showAllTransactions ? "↑" : "↓"}
    </i>
  </button>
)}

    </div>
  )}
</section>
  );
}

export default TransactionsSection;
