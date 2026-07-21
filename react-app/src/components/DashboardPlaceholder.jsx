import { useState } from "react";
import SummaryDashboard from "./SummaryDashboard.jsx";
import TransactionsSection from "./TransactionsSection.jsx";
import { getLocalMonthString, useBudgetData } from "../hooks/useBudgetData.js";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "😴 Tulog Na";
  if (hour < 12) return "🌤️ Maayong Buntag";
  if (hour < 13) return "☀️ Maayong Udto";
  if (hour < 18) return "🌥️ Maayong Hapon";
  if (hour < 22) return "🌙 Maayong Gabi-i";
  return "✨ Good Night";
}

function DashboardPlaceholder({ user, profile, theme, onToggleTheme, onSignOut }) {
  const [selectedMonth, setSelectedMonth] = useState(getLocalMonthString);
  const name = profile?.name || user.email?.split("@")[0] || "User";
  const { inflows, expenses, totals, loading, error } = useBudgetData(
    user.uid,
    selectedMonth,
  );

  return (
    <main className="dashboard-shell">
      <header className="dashboard-topbar">
        <div>
          <p className="eyebrow">Bantay Budget</p>
          <h1>{getGreeting()}, {name} 👋</h1>
        </div>
        <div className="topbar-actions">
          <button className="compact-theme-button" type="button" onClick={onToggleTheme} aria-label={`Use ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className="profile-initial" type="button" onClick={onSignOut} aria-label={`Sign out ${name}`}>
            {name.charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="dashboard-heading-row">
          <div>
            <p className="eyebrow">Financial overview</p>
            <h2>Your monthly budget</h2>
          </div>
          <label className="month-filter">
            <span>Month</span>
            <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
          </label>
        </div>

        {error && <div className="form-message error dashboard-error" role="alert">{error}</div>}

        {loading ? (
          <section className="dashboard-loading" aria-live="polite">
            <div className="loading-dots" aria-hidden="true"><span /><span /><span /></div>
            <p>Loading your financial overview…</p>
          </section>
        ) : (
          <>
            <SummaryDashboard totals={totals} />
            <section className="data-status-grid">
              <article><strong>{inflows.length}</strong><span>Income records this month</span></article>
              <article><strong>{expenses.length}</strong><span>Expense records this month</span></article>
            </section>
            <TransactionsSection inflows={inflows} expenses={expenses} />
          </>
        )}
      </section>
    </main>
  );
}

export default DashboardPlaceholder;
