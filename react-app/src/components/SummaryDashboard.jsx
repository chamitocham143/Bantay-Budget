import { useEffect, useState } from "react";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCurrency(amount) {
  return currencyFormatter.format(Number(amount || 0));
}

const summaryCards = [
  {
    key: "pendingTotal",
    label: "Total Pending",
    note: "Pending payments to settle",
    icon: "⏳",
    featured: true,
    accent: "amber",
  },
  {
    key: "available",
    label: "Remaining Balance",
    note: "After all allocations",
    icon: "↗",
    featured: true,
    accent: "emerald",
  },
  {
    key: "inflowTotal",
    label: "Total Income",
    note: "All income received",
    icon: "💰",
    accent: "green",
  },
  {
    key: "paidTotal",
    label: "Total Paid",
    note: "All paid expenses",
    icon: "✅",
    accent: "teal",
  },
  {
    key: "onHoldTotal",
    label: "Total On Hold",
    note: "Temporarily set aside",
    icon: "⏸",
    accent: "gold",
  },
  {
    key: "allocable",
    label: "Allocable Balance",
    note: "Income minus paid expenses",
    icon: "💵",
    accent: "blue",
  },
];

function clampPercentage(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function getCardPercentage(cardKey, totals) {
  const income = Number(totals.inflowTotal || 0);
  const value = Number(totals[cardKey] || 0);

  if (income <= 0) {
    return 0;
  }

  if (cardKey === "inflowTotal") {
    return 100;
  }

  return clampPercentage((value / income) * 100);
}

function BudgetInsight({ totals }) {
  let tone = "success";
  let title = "You're doing great";
  let text = `All tracked payments are settled. Your remaining balance is ${formatCurrency(
    totals.available
  )}.`;

  if (totals.inflowTotal === 0) {
    tone = "neutral";
    title = "Start your monthly budget";
    text =
      "Add your income first so Bantay Budget can calculate your balances and spending progress.";
  } else if (totals.pendingTotal > totals.available) {
    tone = "warning";
    title = "Your budget needs attention";
    text = `Your pending payments total ${formatCurrency(
      totals.pendingTotal
    )}, which is higher than your remaining balance of ${formatCurrency(
      totals.available
    )}.`;
  } else if (totals.pendingTotal > 0) {
    tone = "info";
    title = "Upcoming payments";
    text = `You have ${formatCurrency(
      totals.pendingTotal
    )} in pending payments and ${formatCurrency(
      totals.available
    )} remaining after allocations.`;
  } else if (totals.onHoldTotal > 0) {
    tone = "neutral";
    title = "Review your on-hold expenses";
    text = `${formatCurrency(
      totals.onHoldTotal
    )} is currently on hold and is not deducted from your remaining balance.`;
  }

  return (
    <aside className={`premium-insight premium-insight-${tone}`}>
      <div className="premium-insight-icon" aria-hidden="true">
        💡
      </div>

      <div className="premium-insight-content">
        <span className="premium-insight-eyebrow">Quick insight</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>

      <div className="premium-insight-decoration" aria-hidden="true">
        ◎
      </div>
    </aside>
  );
}

function useAnimatedPercentage(targetPercentage, duration = 1000) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  useEffect(() => {
    const target = clampPercentage(targetPercentage);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setAnimatedPercentage(target);
      return;
    }

    let animationFrame;
    let startTime;

    setAnimatedPercentage(0);

    const animate = (timestamp) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth ease-out
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setAnimatedPercentage(target * easedProgress);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [targetPercentage, duration]);

  return animatedPercentage;
}

function FeaturedCard({ card, totals }) {
  const percentage = getCardPercentage(card.key, totals);
  const animatedPercentage = useAnimatedPercentage(percentage, 1100);

  return (
    <article
      className={`premium-summary-card premium-featured-card card-${card.accent}`}
    >
      <div className="premium-card-glow" aria-hidden="true" />

      <div className="premium-card-header">
        <span className="premium-summary-icon" aria-hidden="true">
          {card.icon}
        </span>

        <span className="premium-card-percentage">
          {Math.round(animatedPercentage)}%
        </span>
      </div>

      <div className="premium-card-body">
        <p>{card.label}</p>
        <strong>{formatCurrency(totals[card.key])}</strong>
        <small>{card.note}</small>
      </div>

      <div className="premium-featured-chart" aria-hidden="true">
        <span />
        <span />
      </div>

      <div className="premium-card-footer">
        <span>Monthly overview</span>

        <span className="premium-card-arrow" aria-hidden="true">
          →
        </span>
      </div>
    </article>
  );
}

function CompactCard({ card, totals }) {
  const percentage = getCardPercentage(card.key, totals);
  const animatedPercentage = useAnimatedPercentage(percentage, 1100);

  return (
    <article
      className={`premium-summary-card premium-compact-card card-${card.accent}`}
    >
      <div className="premium-compact-heading">
        <span className="premium-summary-icon" aria-hidden="true">
          {card.icon}
        </span>

        <div>
          <p>{card.label}</p>
          <strong>{formatCurrency(totals[card.key])}</strong>
        </div>
      </div>

      <small>{card.note}</small>

      <div className="premium-progress-row">
        <div
          className="premium-progress-track"
          role="progressbar"
          aria-label={`${card.label} percentage`}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={Math.round(percentage)}
        >
          <span
            style={{
              width: `${animatedPercentage}%`,
            }}
          />
        </div>

        <b>{Math.round(animatedPercentage)}%</b>
      </div>
    </article>
  );
}

function SummaryDashboard({ totals }) {
  const featuredCards = summaryCards.filter((card) => card.featured);
  const compactCards = summaryCards.filter((card) => !card.featured);

  return (
    <section className="premium-dashboard-summary">
      <section
        className="premium-featured-grid"
        aria-label="Featured financial overview"
      >
        {featuredCards.map((card) => (
          <FeaturedCard key={card.key} card={card} totals={totals} />
        ))}
      </section>

      <section
        className="premium-compact-grid"
        aria-label="Financial summary"
      >
        {compactCards.map((card) => (
          <CompactCard key={card.key} card={card} totals={totals} />
        ))}
      </section>

      <BudgetInsight totals={totals} />
    </section>
  );
}

export default SummaryDashboard;