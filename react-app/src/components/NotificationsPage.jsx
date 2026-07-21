import { useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";
import { formatCurrency } from "./SummaryDashboard.jsx";

function formatRelativeTime(timestamp) {
  const seconds = Math.max(0, Math.floor((Date.now() - Number(timestamp || 0)) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function NotificationsPage({ notifications, unreadCount, oldReadCount, loading, error, pushEnabled, pushBusy, pushMessage, onClose, onMarkRead, onMarkAllRead, onClearOld, onTogglePush }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  const runAction = async (action) => {
    setActionBusy(true);
    setActionError("");
    try { await action(); } catch (actionFailure) {
      console.error("Notification action failed:", actionFailure);
      setActionError("Unable to update notifications. Please try again.");
    } finally { setActionBusy(false); }
  };

  const clearOld = async () => {
    await runAction(onClearOld);
    setConfirmClear(false);
  };

  return (
    <section className="notifications-page" aria-labelledby="notifications-title">
      <header className="notifications-header">
        <button type="button" onClick={onClose} aria-label="Close notifications">←</button>
        <h1 id="notifications-title">Notifications</h1>
        <span className="header-spacer" />
      </header>
      <div className="notifications-content">
        <section className="push-setting-card">
          <div><h2>Push notifications</h2><p>Notify upcoming recurring due dates on this device.</p></div>
          <label className="switch-control"><input type="checkbox" checked={pushEnabled} disabled={pushBusy} onChange={(event) => onTogglePush(event.target.checked)} /><span /></label>
        </section>
        {pushMessage && <div className={`form-message ${pushMessage.type}`} role="status">{pushMessage.text}</div>}
        {(error || actionError) && <div className="form-message error" role="alert">{error || actionError}</div>}

        <div className="notification-section-heading"><div><p className="eyebrow">Upcoming recurring dues</p><h2>Reminders</h2></div><span>{unreadCount} unread</span></div>
        <div className="notification-toolbar">
          <button type="button" disabled={unreadCount === 0 || actionBusy} onClick={() => runAction(onMarkAllRead)}>✓✓ Mark All Read</button>
          <button className="danger" type="button" disabled={oldReadCount === 0 || actionBusy} onClick={() => setConfirmClear(true)}>⌫ Clear Old</button>
        </div>

        {loading ? <div className="manager-loading">Loading notifications…</div> : notifications.length === 0 ? (
          <div className="transaction-empty"><span aria-hidden="true">🔔</span><h3>No upcoming recurring dues</h3><p>Your reminders will appear here.</p></div>
        ) : (
          <div className="notification-list">
            {notifications.map((item) => (
              <article className={`notification-item ${item.read ? "read" : "unread"}`} key={item.id}>
                <div className="notification-item-icon" aria-hidden="true">↻</div>
                <div><h3>{item.desc || item.title || "Reminder"}</h3><p>{item.message || ""} · {formatCurrency(item.amount)}</p><time>{formatRelativeTime(item.created)}</time>{!item.read && <button type="button" disabled={actionBusy} onClick={() => runAction(() => onMarkRead(item.id))}>Mark read</button>}</div>
              </article>
            ))}
          </div>
        )}
      </div>
      {confirmClear && <ConfirmDialog title="Clear Old Notifications?" message="Delete read notifications older than 7 days?" busy={actionBusy} onCancel={() => setConfirmClear(false)} onConfirm={clearOld} />}
    </section>
  );
}

export default NotificationsPage;
