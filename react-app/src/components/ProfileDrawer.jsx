import { useEffect, useRef } from "react";

function ProfileDrawer({ name, email, theme, unreadCount, onClose, onNotifications, onRecurring, onSettings, onToggleTheme, onLogout }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.focus();
    const handleKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="profile-drawer" aria-labelledby="drawer-title" ref={drawerRef} tabIndex="-1">
        <header className="drawer-header">
          <div className="drawer-avatar">{name.charAt(0).toUpperCase()}</div>
          <div><h2 id="drawer-title">{name}</h2><p>{email}</p></div>
          <button type="button" onClick={onClose} aria-label="Close menu">×</button>
        </header>
        <nav className="drawer-menu" aria-label="Account menu">
          <button type="button" onClick={onNotifications}><span>🔔</span><div><strong>Notifications</strong><small>View recurring reminders</small></div>{unreadCount > 0 && <b>{unreadCount}</b>}</button>
          <button type="button" onClick={onRecurring}><span>↻</span><div><strong>Manage Recurring</strong><small>Edit, pause, or add templates</small></div><i>›</i></button>
          <button type="button" onClick={onSettings}><span>⚙️</span><div><strong>Settings</strong><small>Account and preferences</small></div><i>›</i></button>
          <button type="button" onClick={onToggleTheme}><span>{theme === "dark" ? "☀️" : "🌙"}</span><div><strong>{theme === "dark" ? "Light Mode" : "Dark Mode"}</strong><small>Change app appearance</small></div><i>›</i></button>
        </nav>
        <button className="drawer-logout" type="button" onClick={onLogout}>⇥ Sign Out</button>
        <p className="drawer-version">Bantay Budget · React migration preview</p>
      </aside>
    </div>
  );
}

export default ProfileDrawer;
