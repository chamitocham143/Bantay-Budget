import { useEffect, useMemo } from "react";
import { formatCurrency } from "./SummaryDashboard.jsx";

const metricDetails = {
  pendingTotal: {
    key: "pending",
    title: "Pending Analysis",
    eyebrow: "Payment outlook",
    description:
      "Track how your pending payments have changed over the last six months.",
    accent: "#f5b82e",
  },

  available: {
    key: "remaining",
    title: "Balance Analysis",
    eyebrow: "Financial trend",
    description:
      "Track how your remaining balance has changed over the last six months.",
    accent: "#12d88a",
  },
};

function getStoredCurrency() {
  if (typeof window === "undefined") {
    return "USD";
  }

  return localStorage.getItem(
    "bantayBudgetCurrency"
  ) === "PHP"
    ? "PHP"
    : "USD";
}

function formatCompactCurrency(amount) {
  const currency = getStoredCurrency();

  return new Intl.NumberFormat(
    currency === "PHP" ? "en-PH" : "en-US",
    {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }
  ).format(Number(amount || 0));
}

function createChartData(series, valueKey) {
  const values = series.map(
    (item) => Number(item[valueKey] || 0)
  );

  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);

  const range = maximum - minimum || 1;

  const left = 58;
  const right = 558;
  const top = 32;
  const bottom = 194;

  const points = series.map((item, index) => {
    const x =
      series.length === 1
        ? (left + right) / 2
        : left +
          (index / (series.length - 1)) *
            (right - left);

    const value = Number(item[valueKey] || 0);

    const y =
      bottom -
      ((value - minimum) / range) *
        (bottom - top);

    return {
      ...item,
      value,
      x,
      y,
    };
  });

  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  const zeroY =
    bottom -
    ((0 - minimum) / range) *
      (bottom - top);

  const areaPath =
    points.length > 0
      ? `${linePath} L ${
          points.at(-1).x
        } ${zeroY} L ${points[0].x} ${zeroY} Z`
      : "";

  const gridLines = Array.from(
    { length: 4 },
    (_, index) => {
      const ratio = index / 3;
      const value = maximum - range * ratio;
      const y =
        top + ratio * (bottom - top);

      return {
        value,
        y,
      };
    }
  );

  return {
    points,
    linePath,
    areaPath,
    gridLines,
    zeroY,
  };
}

function FinancialAnalytics({
  metric,
  series,
  selectedMonth,
  onClose,
}) {
  const config =
    metricDetails[metric] ||
    metricDetails.available;

  const currentMonth =
    series.find(
      (item) => item.value === selectedMonth
    ) || series.at(-1);

  const currentIndex = series.findIndex(
    (item) => item.value === currentMonth?.value
  );

  const previousMonth =
    currentIndex > 0
      ? series[currentIndex - 1]
      : null;

  const currentValue = Number(
    currentMonth?.[config.key] || 0
  );

  const previousValue = Number(
    previousMonth?.[config.key] || 0
  );

  const percentageChange =
    previousValue !== 0
      ? Math.round(
          ((currentValue - previousValue) /
            Math.abs(previousValue)) *
            100
        )
      : null;

  const chartData = useMemo(
    () => createChartData(series, config.key),
    [series, config.key]
  );

  const expenseBreakdown = {
    paid: Number(currentMonth?.paid || 0),
    pending: Number(currentMonth?.pending || 0),
    onHold: Number(currentMonth?.onHold || 0),
  };

  const trackedExpenseTotal =
    expenseBreakdown.paid +
    expenseBreakdown.pending +
    expenseBreakdown.onHold;

  const paidPercentage =
    trackedExpenseTotal > 0
      ? (expenseBreakdown.paid /
          trackedExpenseTotal) *
        100
      : 0;

  const pendingPercentage =
    trackedExpenseTotal > 0
      ? (expenseBreakdown.pending /
          trackedExpenseTotal) *
        100
      : 0;

  const onHoldPercentage =
    trackedExpenseTotal > 0
      ? (expenseBreakdown.onHold /
          trackedExpenseTotal) *
        100
      : 0;

  const hasChartData = chartData.points.some(
    (point) => point.value !== 0
  );

  useEffect(() => {
    const scrollPosition = window.scrollY;
    const previousOverflow =
      document.documentElement.style.overflow;

    const previousBodyStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };

    document.documentElement.style.overflow =
      "hidden";

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );

      document.documentElement.style.overflow =
        previousOverflow;

      document.body.style.position =
        previousBodyStyles.position;

      document.body.style.top =
        previousBodyStyles.top;

      document.body.style.width =
        previousBodyStyles.width;

      document.body.style.overflow =
        previousBodyStyles.overflow;

      window.scrollTo(0, scrollPosition);
    };
  }, [onClose]);

  return (
    <section
      className="financial-analytics-page"
      style={{
        "--analytics-accent": config.accent,
      }}
      aria-labelledby="analytics-title"
    >
      <header className="financial-analytics-header">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Analytics"
        >
          ←
        </button>

        <div>
          <span>{config.eyebrow}</span>
          <h1 id="analytics-title">
            {config.title}
          </h1>
        </div>

        <span />
      </header>

      <main className="financial-analytics-content">
        <section className="analytics-intro">
          <div>
            <p>{currentMonth?.fullLabel}</p>
            <strong>
              {formatCurrency(currentValue)}
            </strong>
            <span>{config.description}</span>
          </div>

          <div
            className={`analytics-change ${
              percentageChange === null
                ? "neutral"
                : percentageChange >= 0
                  ? "up"
                  : "down"
            }`}
          >
            <strong>
              {percentageChange === null
                ? "—"
                : `${
                    percentageChange >= 0
                      ? "↗"
                      : "↘"
                  } ${Math.abs(percentageChange)}%`}
            </strong>

            <span>vs previous month</span>
          </div>
        </section>

        <section
          className="analytics-stat-grid"
          aria-label="Analytics summary"
        >
          <article>
            <span>Current month</span>
            <strong>
              {formatCurrency(currentValue)}
            </strong>
          </article>

          <article>
            <span>Previous month</span>
            <strong>
              {previousMonth
                ? formatCurrency(previousValue)
                : "—"}
            </strong>
          </article>

          <article>
            <span>Six-month average</span>
            <strong>
              {formatCurrency(
                series.reduce(
                  (sum, item) =>
                    sum +
                    Number(
                      item[config.key] || 0
                    ),
                  0
                ) / Math.max(series.length, 1)
              )}
            </strong>
          </article>
        </section>

        <section className="analytics-chart-section">
          <div className="analytics-section-heading">
            <div>
              <span>Six-month trend</span>
              <h2>{config.title}</h2>
            </div>

            <small>
              {series[0]?.label}–
              {series.at(-1)?.label}
            </small>
          </div>

          <div className="analytics-chart">
            {!hasChartData && (
              <div className="analytics-chart-empty">
                No recorded data for this period
              </div>
            )}

            <svg
              className="analytics-chart-svg"
              viewBox="0 0 600 245"
              role="img"
              aria-label={`${config.title} for the last six months`}
            >
              <defs>
                <linearGradient
                  id={`analytics-area-${metric}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--analytics-accent)"
                    stopOpacity="0.28"
                  />

                  <stop
                    offset="100%"
                    stopColor="var(--analytics-accent)"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {chartData.gridLines.map(
                (line, index) => (
                  <g key={index}>
                    <line
                      className="analytics-grid-line"
                      x1="58"
                      x2="558"
                      y1={line.y}
                      y2={line.y}
                    />

                    <text
                      className="analytics-axis-value"
                      x="49"
                      y={line.y + 4}
                      textAnchor="end"
                    >
                      {formatCompactCurrency(
                        line.value
                      )}
                    </text>
                  </g>
                )
              )}

              <path
                className="analytics-area"
                d={chartData.areaPath}
                fill={`url(#analytics-area-${metric})`}
              />

              <path
                className="analytics-line"
                d={chartData.linePath}
              />

              {chartData.points.map((point) => (
                <g key={point.value + point.month}>
                  <circle
                    className="analytics-point-ring"
                    cx={point.x}
                    cy={point.y}
                    r="8"
                  />

                  <circle
                    className="analytics-point"
                    cx={point.x}
                    cy={point.y}
                    r="4"
                  />

                  <text
                    className="analytics-month-label"
                    x={point.x}
                    y="226"
                    textAnchor="middle"
                  >
                    {point.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </section>

        <section className="analytics-breakdown">
          <div className="analytics-section-heading">
            <div>
              <span>Expense status</span>
              <h2>Monthly breakdown</h2>
            </div>

            <small>
              {currentMonth?.fullLabel}
            </small>
          </div>

          {trackedExpenseTotal > 0 ? (
            <>
              <div
                className="analytics-stacked-bar"
                aria-label="Expense status breakdown"
              >
                <span
                  className="paid"
                  style={{
                    width: `${paidPercentage}%`,
                  }}
                />

                <span
                  className="pending"
                  style={{
                    width: `${pendingPercentage}%`,
                  }}
                />

                <span
                  className="hold"
                  style={{
                    width: `${onHoldPercentage}%`,
                  }}
                />
              </div>

              <div className="analytics-breakdown-list">
                <div>
                  <span className="paid" />
                  <p>Paid</p>
                  <strong>
                    {formatCurrency(
                      expenseBreakdown.paid
                    )}
                  </strong>
                </div>

                <div>
                  <span className="pending" />
                  <p>Pending</p>
                  <strong>
                    {formatCurrency(
                      expenseBreakdown.pending
                    )}
                  </strong>
                </div>

                <div>
                  <span className="hold" />
                  <p>On Hold</p>
                  <strong>
                    {formatCurrency(
                      expenseBreakdown.onHold
                    )}
                  </strong>
                </div>
              </div>
            </>
          ) : (
            <div className="analytics-empty-state">
              No expenses recorded for this month.
            </div>
          )}
        </section>
      </main>
    </section>
  );
}

export default FinancialAnalytics;