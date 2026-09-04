import { useEffect } from "react";

function SettingsPage({ name, email, theme, currency, onCurrencyChange, pushEnabled, emailRemindersEnabled, emailRemindersBusy, emailRemindersMessage, appLockEnabled, biometricUnlockEnabled, biometricAvailable, biometricBusy, biometricMessage, accountMessage, unreadCount, backupBusy, backupMessage, onClose, onToggleTheme, onToggleEmailReminders, onToggleAppLock, onToggleBiometricUnlock, onNotifications, onRecurring, onExportCsv, onExportBackup, onRestoreFile, onFaq, onAbout, onChangeEmail, onDeleteAccount, onLogout }) {
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
          <div className="settings-currency-row">
  <span aria-hidden="true">
    {currency === "PHP" ? "🇵🇭" : "🇺🇸"}
  </span>

  <div>
    <strong>Currency</strong>

    <small>
      {currency === "PHP"
        ? "Philippine Peso (₱)"
        : "US Dollar ($)"}
    </small>
  </div>

  <select
    value={currency}
    onChange={(event) =>
      onCurrencyChange(event.target.value)
    }
    aria-label="Select currency" 
  >
    <option value="USD">USD — $</option>
    <option value="PHP">PHP — ₱</option>
  </select>
</div>
          <button type="button" onClick={onNotifications}><span>🔔</span><div><strong>Notifications</strong><small>{pushEnabled ? "Push enabled on this device" : "Push disabled on this device"}</small></div>{unreadCount > 0 ? <b>{unreadCount}</b> : <i>›</i>}</button>
          <div className="settings-toggle-row"><span>✉️</span><div><strong>Email Reminders</strong><small>{emailRemindersEnabled ? `Send 3-day reminders to ${email}` : "Optional reminders for recurring dues"}</small></div><label className="switch-control"><input type="checkbox" checked={emailRemindersEnabled} disabled={emailRemindersBusy} onChange={(event) => onToggleEmailReminders(event.target.checked)} /><span /></label></div>
          <button type="button" onClick={onRecurring}><span>↻</span><div><strong>Recurring Expenses</strong><small>Manage monthly templates</small></div><i>›</i></button>
          <div className="settings-toggle-row"><span>⏱️</span><div><strong>Automatic Sign-Out</strong><small>Sign out after 3 minutes of inactivity</small></div><label className="switch-control"><input type="checkbox" checked={appLockEnabled} onChange={(event) => onToggleAppLock(event.target.checked)} /><span /></label></div>
          <div className="settings-toggle-row"><span>◉</span><div><strong>Face ID Login</strong><small>{biometricAvailable === false ? "Not available in this browser" : biometricUnlockEnabled ? "Shown on the login page on this device" : "Sign in securely without typing your password"}</small></div><label className="switch-control"><input type="checkbox" checked={biometricUnlockEnabled} disabled={biometricAvailable !== true || biometricBusy} onChange={(event) => onToggleBiometricUnlock(event.target.checked)} /><span /></label></div>
        </section>
        {emailRemindersMessage && <div className={`form-message ${emailRemindersMessage.type}`} role="status">{emailRemindersMessage.text}</div>}
        {biometricMessage && <div className={`form-message ${biometricMessage.type}`} role="status">{biometricMessage.text}</div>}
        <p className="settings-note">Changing tabs, windows, or apps does not trigger an immediate sign-out. When you return, Bantay Budget checks whether three inactive minutes have elapsed.</p>
        <p className="settings-note">Face ID data never leaves your device. iOS may offer the device passcode as a secure fallback.</p>

        <div className="settings-section-label">Data Backup</div>
        <section className="backup-settings-card">
          <div className="backup-settings-heading"><span>☁️</span><div><strong>Protect your data</strong><small>Export a copy or restore a previous Bantay Budget backup.</small></div></div>
          {backupMessage && <div className={`form-message ${backupMessage.type}`} role="status">{backupMessage.text}</div>}
          <div className="backup-action-grid">
            <button type="button" disabled={backupBusy} onClick={onExportBackup}><span>↑</span><strong>Export Backup</strong><small>Download JSON file</small></button>
            <label className={backupBusy ? "disabled" : ""}><input type="file" accept="application/json,.json" disabled={backupBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) onRestoreFile(file); event.target.value = ""; }} /><span>↓</span><strong>Restore Backup</strong><small>Choose JSON file</small></label>
          </div>
          <button className="csv-export-button" type="button" onClick={onExportCsv}>📄 Export selected month as CSV</button>
          <p className="backup-privacy">🛡️ Backup files stay on your device unless you choose to share them.</p>
        </section>

        <div className="settings-section-label">Help and Information</div>
        <section className="settings-list">
          <button type="button" onClick={onFaq}><span>❔</span><div><strong>FAQ’s</strong><small>Dashboard, balances, recurring expenses, and backups</small></div><i>›</i></button>
          <button type="button" onClick={onAbout}><span>ℹ️</span><div><strong>About</strong><small>App version, website, and developer</small></div><i>›</i></button>
        </section>

        <div className="settings-section-label">Account</div>
        <section className="settings-list">
          <button type="button" onClick={onChangeEmail}><span>✉️</span><div><strong>Change Email</strong><small>{email}</small></div><i>›</i></button>
          <div className="settings-static-row"><span>🛡️</span><div><strong>Email verification</strong><small>Verified</small></div><em>✓</em></div>
          <button className="settings-delete-account" type="button" onClick={onDeleteAccount}><span>⚠️</span><div><strong>Delete Account</strong><small>Permanently remove your account and data</small></div><i>›</i></button>
        </section>
        {accountMessage && <div className={`form-message ${accountMessage.type}`} role="status">{accountMessage.text}</div>}

        <button className="settings-logout" type="button" onClick={onLogout}>Sign Out</button>
        <footer className="settings-footer"><strong>Bantay Budget</strong><span>Version 1.0.0</span></footer>
      </div>
    </section>


  );
}

export default SettingsPage;
