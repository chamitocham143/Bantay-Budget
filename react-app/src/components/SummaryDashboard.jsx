import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const currencyFormatters = new Map();

function getSelectedCurrency() {
  if (typeof window === "undefined") {
    return "USD";
  }

  return localStorage.getItem(
    "bantayBudgetCurrency"
  ) === "PHP"
    ? "PHP"
    : "USD";
}

export function formatCurrency(amount) {
  const currency = getSelectedCurrency();

  if (!currencyFormatters.has(currency)) {
    const locale =
      currency === "PHP" ? "en-PH" : "en-US";

    currencyFormatters.set(
      currency,
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  return currencyFormatters
    .get(currency)
    .format(Number(amount || 0));
}

const summaryCards = [
  {
    key: "pendingTotal",
    label: "Total Pending",
    note: "Pending payments to settle",
    info:
      "The total amount of expenses marked Pending. These payments have not been paid yet but are included in your planned allocations.",
    icon: "⏳",
    featured: true,
    accent: "amber",
  },
  {
    key: "available",
    label: "Remaining Balance",
    note: "After all allocations",
    info:
      "The amount remaining after paid and pending expenses are allocated. Expenses placed On Hold are not deducted from this balance.",
    icon: "↗",
    featured: true,
    accent: "emerald",
  },
  {
    key: "onHoldTotal",
    label: "Total On Hold",
    note: "Temporarily set aside",
    info:
      "The total amount of expenses placed On Hold. These expenses are tracked but are not currently deducted from your remaining balance.",
    icon: "⏸",
    accent: "gold",
  },
  {
    key: "allocable",
    label: "Allocable Balance",
    note: "Income minus paid expenses",
    info:
      "The amount available for allocation after paid expenses are deducted. Pending payments have not yet been deducted from this amount.",
    icon: "💵",
    accent: "blue",
  },
  {
    key: "inflowTotal",
    label: "Total Income",
    note: "All income received",
    info:
      "The total income recorded for the selected month. All summary percentages are compared with this amount.",
    icon: "💰",
    accent: "green",
  },
  {
    key: "paidTotal",
    label: "Total Paid",
    note: "All paid expenses",
    info:
      "The total amount of expenses marked Paid for the selected month. Paid expenses are deducted from your income.",
    icon: "✅",
    accent: "teal",
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

function SummaryInfo({
  card,
  isOpen,
  onToggle,
}) {
  const tooltipId = `summary-info-${card.key}`;

  const mobileTooltip =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="summary-mobile-tooltip"
            role="tooltip"
            aria-live="polite"
          >
            <strong>{card.label}</strong>
            <p>{card.info}</p>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className={`summary-info ${
          isOpen ? "is-open" : ""
        }`}
      >
        <button
          className="summary-info-button"
          type="button"
          aria-label={`Information about ${card.label}`}
          aria-expanded={isOpen}
          aria-controls={tooltipId}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
        >
          <span aria-hidden="true">i</span>
        </button>

        <div
          className="summary-info-tooltip"
          id={tooltipId}
          role="tooltip"
        >
          <strong>{card.label}</strong>
          <p>{card.info}</p>
        </div>
      </div>

      {mobileTooltip}
    </>
  );
}

function FeaturedCard({
  card,
  totals,
  infoOpen,
  onInfoToggle,
  onOpenAnalysis,
}) {
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

        <div className="premium-card-header-meta">
          <span className="premium-card-percentage">
            {Math.round(animatedPercentage)}%
          </span>

          <SummaryInfo
            card={card}
            isOpen={infoOpen}
            onToggle={onInfoToggle}
          />
        </div>
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

      <button
          className="premium-card-footer"
          type="button"
          
          onClick={(event) => {
          event.stopPropagation();

          onOpenAnalysis();
        }}
          
        >
          <span>View Analysis</span>

          <span
            className="premium-card-arrow"
            aria-hidden="true"
          >
            →
          </span>
        </button>

    </article>
  );
}

    function CompactCard({
      card,
      totals,
      infoOpen,
      onInfoToggle,
    }) {
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

        <SummaryInfo
          card={card}
          isOpen={infoOpen}
          onToggle={onInfoToggle}
        />
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

function SummaryDashboard({ totals, onOpenAnalysis, }) {
  const [openInfoKey, setOpenInfoKey] = useState(null);

  const featuredCards = summaryCards.filter(
    (card) => card.featured
  );

  const compactCards = summaryCards.filter(
    (card) => !card.featured
  );

  useEffect(() => {
    function handleOutsidePress(event) {
      if (!event.target.closest(".summary-info")) {
        setOpenInfoKey(null);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpenInfoKey(null);
      }
    }

    document.addEventListener(
      "pointerdown",
      handleOutsidePress
    );

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsidePress
      );

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  return (
    <section className="premium-dashboard-summary">
      <section
        className="premium-featured-grid"
        aria-label="Featured financial overview"
      >
        {featuredCards.map((card) => (
          <FeaturedCard
            key={card.key}
            card={card}
            totals={totals}
            infoOpen={openInfoKey === card.key}
            onInfoToggle={() => {
              setOpenInfoKey((currentKey) =>
                currentKey === card.key
                  ? null
                  : card.key
              );
            }}
            onOpenAnalysis={() =>
              onOpenAnalysis?.(card.key)
            }
          />
        ))}
      </section>

      <section
        className="premium-compact-grid"
        aria-label="Financial summary"
      >
        {compactCards.map((card) => (
          <CompactCard
            key={card.key}
            card={card}
            totals={totals}
            infoOpen={openInfoKey === card.key}
            onInfoToggle={() => {
              setOpenInfoKey((currentKey) =>
                currentKey === card.key
                  ? null
                  : card.key
              );
            }}
          />
        ))}
      </section>

      <BudgetInsight totals={totals} />
    </section>
  );
}

export default SummaryDashboard;