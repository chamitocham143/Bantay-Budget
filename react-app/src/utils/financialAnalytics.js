const CATEGORY_RULES = [
  {
    category: "Groceries",
    icon: "🛒",
    keywords: [
      "walmart",
      "costco",
      "aldi",
      "ralphs",
      "vons",
      "trader joe",
      "seafood city",
      "food 4 less",
      "grocery",
      "market",
      "seafood city",
      "filipino depot"
    ],
  },
  {
    category: "Dining",
    icon: "🍽️",
    keywords: [
      "mcdonald",
      "jollibee",
      "starbucks",
      "restaurant",
      "doordash",
      "uber eats",
      "ubereats",
      "grubhub",
      "pizza",
      "cafe",
      "mcdo",
      "buffet",
      "bbq",
      "seafood"
    ],
  },
  {
    category: "Utilities",
    icon: "💡",
    keywords: [
      "sdge",
      "electric",
      "water bill",
      "internet",
      "spectrum",
      "verizon",
      "at&t",
      "phone bill",
      "utility",
      "sdg&e",
      "water",
      "primo",
      
    ],
  },
  {
    category: "Credit Cards",
    icon: "💳",
    keywords: [
      "apple card",
      "first premiere",
      "capital one",
      "synchrony",
      "best buy",
      "bank loan",
      "frontwave",
      "loan",
      "mission lane"
    ],
  },
  {
    category: "Transportation",
    icon: "🚗",
    keywords: [
      "shell",
      "chevron",
      "arco",
      "mobil",
      "uber",
      "lyft",
      "parking",
      "car wash",
      "auto repair",
      "dmv",
      "car payment",
      "toyota",
      "honda",
      "rivian",
      "tesla",
      "mazda",
      "ford",
      "chevrole",
      "hyundai",
      "kia",
      "acura",
      "lexus",
      "scion",
      "bmw",
      "mercedes benz",
      "car",
      "honda financial",
      "toyota financial",
      "ford credit",
      "capital one auto",
      "car insurance"
    ],
  },
  {
    category: "Housing",
    icon: "🏠",
    keywords: [
      "rent",
      "mortgage",
      "hoa",
      "property tax",
      "home insurance",
      "house",
    ],
  },
  {
    category: "Subscriptions",
    icon: "▶️",
    keywords: [
      "netflix",
      "spotify",
      "disney",
      "hulu",
      "youtube premium",
      "apple music",
      "icloud",
      "subscription",
      "prime",
      "prime video",
      "annual renewal",
    ],
  },
  {
    category: "Health",
    icon: "💊",
    keywords: [
      "cvs",
      "walgreens",
      "pharmacy",
      "doctor",
      "dental",
      "hospital",
      "medical",
      "health",
      "kaiser"
    ],
  },
  {
    category: "Shopping",
    icon: "🛍️",
    keywords: [
      "amazon",
      "ebay",
      "best buy",
      "nike",
      "shopping",
      "clothing",
      "clothes",
      "adidas",
      "victoria's secret",
      "victoria secret",
      "macy's",
      "bath & body",

    ],
  },
  {
    category: "Education",
    icon: "🎓",
    keywords: [
      "school",
      "tuition",
      "course",
      "books",
      "udemy",
    ],
  },

  {
    category: "Beauty",
    icon: "💄",
    keywords: [
      "ulta",
      "beauty",
    ],
  },
  {
    category: "Entertainment",
    icon: "🎬",
    keywords: [
      "cinema",
      "movie",
      "theater",
      "concert",
      "amusement",
      "game",
    ],
  },
];

export function inferExpenseCategory(description = "") {
  const normalizedDescription = String(description)
    .trim()
    .toLowerCase();

  const matchingRule = CATEGORY_RULES.find(
    ({ keywords }) =>
      keywords.some((keyword) =>
        normalizedDescription.includes(keyword)
      )
  );

  return matchingRule
    ? {
        name: matchingRule.category,
        icon: matchingRule.icon,
      }
    : {
        name: "Other",
        icon: "📦",
      };
}

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

const paidExpenses = monthlyExpenses.filter(
  (expense) => expense.status === "PAID"
);

const categoryMap = paidExpenses.reduce(
  (categories, expense) => {
    const category = inferExpenseCategory(
      expense.desc
    );

    if (!categories[category.name]) {
      categories[category.name] = {
        name: category.name,
        icon: category.icon,
        amount: 0,
        count: 0,
      };
    }

    categories[category.name].amount +=
      Number(expense.amount) || 0;

    categories[category.name].count += 1;

    return categories;
  },
  {}
);

const categoryTotal = Object.values(
  categoryMap
).reduce(
  (total, category) => total + category.amount,
  0
);

const categoryBreakdown = Object.values(
  categoryMap
)
  .map((category) => ({
    ...category,
    percentage:
      categoryTotal > 0
        ? (category.amount / categoryTotal) * 100
        : 0,
  }))
  .sort((a, b) => b.amount - a.amount);

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
    categoryBreakdown,
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