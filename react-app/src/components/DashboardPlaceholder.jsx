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
  const name = profile?.name || user.email?.split("@")[0] || "User";

  return (
    <main className="dashboard-shell">
      <header className="dashboard-topbar">
        <div>
          <p className="eyebrow">Bantay Budget</p>
          <h1>{getGreeting()}, {name} 👋</h1>
        </div>
        <div className="profile-initial" aria-label={`${name} profile`}>
          {name.charAt(0).toUpperCase()}
        </div>
      </header>

      <section className="migration-card dashboard-card">
        <p className="eyebrow">Authentication connected</p>
        <h2>Your account is ready</h2>
        <p className="status-copy">
          The dashboard data and financial cards will be connected in the next migration checkpoint.
        </p>
        <div className="dashboard-actions">
          <button className="secondary-button" type="button" onClick={onToggleTheme}>
            Use {theme === "dark" ? "light" : "dark"} mode
          </button>
          <button className="danger-button" type="button" onClick={onSignOut}>Sign out</button>
        </div>
      </section>
    </main>
  );
}

export default DashboardPlaceholder;
