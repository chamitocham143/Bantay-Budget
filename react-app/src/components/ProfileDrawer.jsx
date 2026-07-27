import { useEffect, useRef, useState } from "react";

function ProfileDrawer({
  name,
  email,
  theme,
  unreadCount,
  onClose,
  onNotifications,
  onRecurring,
  onExportCsv,
  onCalculator,
  onSettings,
  onToggleTheme,
  onLogout,
}) {
  const drawerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const onCloseRef = useRef(onClose);

  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const closeDrawer = (afterClose) => {
    if (isClosing) return;

    setIsClosing(true);

    closeTimerRef.current = window.setTimeout(() => {
      onCloseRef.current();

      if (afterClose) {
        afterClose();
      }
    }, 280);
  };

  useEffect(() => {
  const scrollPosition = window.scrollY;

  const previousHtmlOverflow =
    document.documentElement.style.overflow;

  const previousBodyStyles = {
    overflow: document.body.style.overflow,
    position: document.body.style.position,
    top: document.body.style.top,
    left: document.body.style.left,
    right: document.body.style.right,
    width: document.body.style.width,
  };

  document.documentElement.style.overflow = "hidden";

  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollPosition}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";

  drawerRef.current?.focus();

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      closeDrawer();
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);

    document.documentElement.style.overflow =
      previousHtmlOverflow;

    document.body.style.overflow =
      previousBodyStyles.overflow;

    document.body.style.position =
      previousBodyStyles.position;

    document.body.style.top =
      previousBodyStyles.top;

    document.body.style.left =
      previousBodyStyles.left;

    document.body.style.right =
      previousBodyStyles.right;

    document.body.style.width =
      previousBodyStyles.width;

    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }

    window.scrollTo(0, scrollPosition);
  };
}, []);

  return (
   <div
  className={`drawer-backdrop ${isClosing ? "is-closing" : ""}`}
  onMouseDown={(event) => {
    if (event.target === event.currentTarget) {
      closeDrawer();
    }
  }}
>
  <aside
    className={`profile-drawer ${isClosing ? "is-closing" : ""}`}
    aria-labelledby="drawer-title"
    ref={drawerRef}
    tabIndex="-1"
  >
        <header className="drawer-header">
          <div className="drawer-avatar">{name.charAt(0).toUpperCase()}</div>
          <div><h2 id="drawer-title">{name}</h2><p>{email}</p></div>
          <button type="button" onClick={() => closeDrawer()} aria-label="Close menu"> × </button>
        </header>
        <nav className="drawer-menu" aria-label="Account menu">
          <button type="button" onClick={() => closeDrawer(onNotifications)}><span>🔔</span><div><strong>Notifications</strong><small>View recurring reminders</small></div>{unreadCount > 0 && <b>{unreadCount}</b>}</button>
          <button type="button" onClick={() => closeDrawer(onRecurring)}><span>↻</span><div><strong>Manage Recurring</strong><small>Edit, pause, or add templates</small></div><i>›</i></button>
          <button type="button" onClick={() => closeDrawer(onExportCsv)}><span>📄</span><div><strong>Export CSV</strong><small>Download the selected month</small></div><i>↓</i></button>
          <button type="button" onClick={() => closeDrawer(onCalculator)}><span>🧮</span><div><strong>Calculator</strong><small>Quick budget calculations</small></div><i>›</i></button>
          <button type="button" onClick={() => closeDrawer(onSettings)}><span>⚙️</span><div><strong>Settings</strong><small>Account and preferences</small></div><i>›</i></button>
          <button type="button" onClick={onToggleTheme}><span>{theme === "dark" ? "☀️" : "🌙"}</span><div><strong>{theme === "dark" ? "Light Mode" : "Dark Mode"}</strong><small>Change app appearance</small></div><i>›</i></button>
        </nav>
          <button
          className="drawer-logout"
          type="button"
          onClick={() => closeDrawer(onLogout)}
        >
          ⇥ Sign Out
        </button>
        <p className="drawer-version">Bantay Budget · React migration preview</p>
      </aside>
    </div>
  );
}

export default ProfileDrawer;
