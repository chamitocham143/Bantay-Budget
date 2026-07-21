const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCurrency(amount) {
  return currencyFormatter.format(Number(amount || 0));
}

const summaryCards = [
  { key: "pendingTotal", label: "Total Pending", note: "Pending payments to settle", icon: "⏳", featured: true },
  { key: "available", label: "Remaining Balance", note: "After all allocations", icon: "📈", featured: true },
  { key: "inflowTotal", label: "Total Income", note: "All income received", icon: "💰" },
  { key: "paidTotal", label: "Total Paid", note: "All paid expenses", icon: "✅" },
  { key: "onHoldTotal", label: "Total On Hold", note: "Currently outside the budget", icon: "⏸️" },
  { key: "allocable", label: "Allocable Balance", note: "Income minus paid expenses", icon: "💵" },
];

function BudgetInsight({ totals }) {
  let tone = "success";
  let title = "Great job!";
  let text = `All tracked payments are settled. Your available balance is ${formatCurrency(totals.available)}.`;

  if (totals.inflowTotal === 0) {
    tone = "neutral";
    title = "No inflows yet";
    text = "Add your income first so Bantay Budget can calculate your available balance.";
  } else if (totals.pendingTotal > totals.available) {
    tone = "warning";
    title = "Budget Watch";
    text = `Your pending payments total ${formatCurrency(totals.pendingTotal)}, which is higher than your available balance of ${formatCurrency(totals.available)}.`;
  } else if (totals.pendingTotal > 0) {
    tone = "info";
    title = "Upcoming Payments";
    text = `You have ${formatCurrency(totals.pendingTotal)} in pending payments. Your available balance is ${formatCurrency(totals.available)}.`;
  } else if (totals.onHoldTotal > 0) {
    tone = "neutral";
    title = "On Hold Items";
    text = `${formatCurrency(totals.onHoldTotal)} is currently on hold and not deducted from your available balance.`;
  }

  return (
    <aside className={`budget-insight ${tone}`}>
      <span aria-hidden="true">💡</span>
      <div><h2>{title}</h2><p>{text}</p></div>
    </aside>
  );
}

function SummaryDashboard({ totals }) {
  const featuredCards = summaryCards.filter((card) => card.featured);
  const compactCards = summaryCards.filter((card) => !card.featured);

  const renderCard = (card) => (
    <article className={`summary-card ${card.key}`} key={card.key}>
      <span className="summary-icon" aria-hidden="true">{card.icon}</span>
      <div>
        <p>{card.label}</p>
        <strong>{formatCurrency(totals[card.key])}</strong>
        <small>{card.note}</small>
      </div>
    </article>
  );

  return (
    <>
      <section className="summary-grid featured-summary">{featuredCards.map(renderCard)}</section>
      <section className="summary-grid compact-summary">{compactCards.map(renderCard)}</section>
      <BudgetInsight totals={totals} />
    </>
  );
}

export default SummaryDashboard;
