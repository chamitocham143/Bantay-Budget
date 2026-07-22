export default function BottomActionBar({
  onAddInflow,
  onAddExpense,
  onRecurring,
}) {
  return (
    <div className="premium-bottom-actions">
      <button
        type="button"
        className="premium-action-button inflow-action"
        onClick={onAddInflow}
      >
        <span className="premium-action-icon" aria-hidden="true">
          💳
        </span>

        <span>+ Add Income</span>
      </button>

      <button
        type="button"
        className="premium-action-button expense-action"
        onClick={onAddExpense}
      >
        <span className="premium-action-icon" aria-hidden="true">
          🧾
        </span>

        <span>+ Add Expense</span>
      </button>

      <button
        type="button"
        className="premium-action-button recurring-action"
        onClick={onRecurring}
      >
        <span
          className="premium-action-icon recurring-action-icon"
          aria-hidden="true"
        >
          ↻
        </span>

        <span>Recurring</span>
      </button>
    </div>
  );
}