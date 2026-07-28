function getInflowMonth(inflow) {
  return (
    inflow.date?.slice(0, 7) ||
    inflow.month ||
    ""
  );
}

function getExpenseMonth(expense) {
  const relevantDate = expense.recurring
    ? expense.dueDate || expense.date
    : expense.date;

  return relevantDate?.slice(0, 7) || "";
}

function createMonthValue(date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function createMonthLabel(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(date);
}

export function getAnalyticsMonths(
  anchorMonth,
  count = 6
) {
  const [year, month] = anchorMonth
    .split("-")
    .map(Number);

  return Array.from({ length: count }, (_, index) => {
    const offset = count - 1 - index;

    const date = new Date(
      year,
      month - 1 - offset,
      1
    );

    return {
      value: createMonthValue(date),
      label: createMonthLabel(date),
      fullLabel: new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(date),
    };
  });
}

export function calculateAnalyticsMonth(
  month,
  allInflows,
  allExpenses
) {
  
    const monthlyInflows = allInflows.filter((item) => {
  const itemMonth = String(
    item.date || item.month || ""
  ).slice(0, 7);

  return itemMonth === month;
});

  const monthlyExpenses = allExpenses.filter((item) => {
  const relevantDate = item.recurring
    ? item.dueDate || item.date
    : item.date;

  return String(relevantDate || "").slice(0, 7) === month;
});

  const income = monthlyInflows.reduce(
  (total, item) => total + (Number(item.amount) || 0),
  0
);

  const expenseTotals = monthlyExpenses.reduce(
    (summary, item) => {
      const amount = Number(item.amount || 0);

      if (item.status === "PAID") {
        summary.paid += amount;
      }

      if (item.status === "PENDING") {
        summary.pending += amount;
      }

      if (item.status === "ON HOLD") {
        summary.onHold += amount;
      }

      return summary;
    },
    {
      paid: 0,
      pending: 0,
      onHold: 0,
    }
  );

  const allocable = income - expenseTotals.paid;

  const remaining =
    allocable - expenseTotals.pending;

  const spendingRate =
    income > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (expenseTotals.paid / income) * 100
          )
        )
      : 0;

  const remainingRate =
    income > 0
      ? Math.min(
          100,
          Math.max(0, (remaining / income) * 100)
        )
      : 0;

  return {
    month,
    income,
    paid: expenseTotals.paid,
    pending: expenseTotals.pending,
    onHold: expenseTotals.onHold,
    allocable,
    remaining,
    spendingRate,
    remainingRate,
    inflowCount: monthlyInflows.length,
    expenseCount: monthlyExpenses.length,
  };
}

export function buildAnalyticsSeries({
  anchorMonth,
  allInflows,
  allExpenses,
  count = 6,
}) {
  return getAnalyticsMonths(
    anchorMonth,
    count
  ).map((month) => ({
    ...month,

    ...calculateAnalyticsMonth(
      month.value,
      allInflows,
      allExpenses
    ),
  }));
}