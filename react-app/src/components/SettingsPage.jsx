import { useEffect } from "react";

function SettingsPage({ name, email, theme, pushEnabled, unreadCount, backupBusy, backupMessage, onClose, onToggleTheme, onNotifications, onRecurring, onExportBackup, onRestoreFile, onFaq, onAbout, onLogout }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <header className="settings-header">
        <button type="button" onClick={onClose} aria-label="Close settings">←</button>
        <h1 id="settings-title">Settings</h1>
        <span />
      </header>
      <div className="settings-content">
        <section className="settings-profile-card">
          <div className="settings-avatar">{name.charAt(0).toUpperCase()}</div>
          <div><h2>{name}</h2><p>{email}</p><span>Verified account</span></div>
        </section>

        <div className="settings-section-label">Preferences</div>
        <section className="settings-list">
          <button type="button" onClick={onToggleTheme}><span>{theme === "dark" ? "☀️" : "🌙"}</span><div><strong>Appearance</strong><small>Currently using {theme} mode</small></div><i>›</i></button>
          <button type="button" onClick={onNotifications}><span>🔔</span><div><strong>Notifications</strong><small>{pushEnabled ? "Push enabled on this device" : "Push disabled on this device"}</small></div>{unreadCount > 0 ? <b>{unreadCount}</b> : <i>›</i>}</button>
          <button type="button" onClick={onRecurring}><span>↻</span><div><strong>Recurring Expenses</strong><small>Manage monthly templates</small></div><i>›</i></button>
        </section>

        <div className="settings-section-label">Data Backup</div>
        <section className="backup-settings-card">
          <div className="backup-settings-heading"><span>☁️</span><div><strong>Protect your data</strong><small>Export a copy or restore a previous Bantay Budget backup.</small></div></div>
          {backupMessage && <div className={`form-message ${backupMessage.type}`} role="status">{backupMessage.text}</div>}
          <div className="backup-action-grid">
            <button type="button" disabled={backupBusy} onClick={onExportBackup}><span>↑</span><strong>Export Backup</strong><small>Download JSON file</small></button>
            <label className={backupBusy ? "disabled" : ""}><input type="file" accept="application/json,.json" disabled={backupBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) onRestoreFile(file); event.target.value = ""; }} /><span>↓</span><strong>Restore Backup</strong><small>Choose JSON file</small></label>
          </div>
          <p className="backup-privacy">🛡️ Backup files stay on your device unless you choose to share them.</p>
        </section>

        <div className="settings-section-label">Help and Information</div>
        <section className="settings-list">
          <button type="button" onClick={onFaq}><span>❔</span><div><strong>FAQ’s</strong><small>Dashboard, balances, recurring expenses, and backups</small></div><i>›</i></button>
          <button type="button" onClick={onAbout}><span>ℹ️</span><div><strong>About</strong><small>App version, website, and developer</small></div><i>›</i></button>
        </section>

        <div className="settings-section-label">Account</div>
        <section className="settings-list">
          <div className="settings-static-row"><span>✉️</span><div><strong>Email</strong><small>{email}</small></div></div>
          <div className="settings-static-row"><span>🛡️</span><div><strong>Email verification</strong><small>Verified</small></div><em>✓</em></div>
        </section>

        <button className="settings-logout" type="button" onClick={onLogout}>Sign Out</button>
        <footer className="settings-footer"><strong>Bantay Budget</strong><span>React migration preview</span></footer>
      </div>
    </section>
  );
}

export default SettingsPage;
