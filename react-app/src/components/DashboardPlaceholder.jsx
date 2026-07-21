import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import SummaryDashboard from "./SummaryDashboard.jsx";
import TransactionsSection from "./TransactionsSection.jsx";
import InflowModal from "./InflowModal.jsx";
import ExpenseModal from "./ExpenseModal.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import { getLocalMonthString, useBudgetData } from "../hooks/useBudgetData.js";
import { useRecurringExpenses } from "../hooks/useRecurringExpenses.js";
import RecurringManager from "./RecurringManager.jsx";
import RecurringTemplateModal from "./RecurringTemplateModal.jsx";
import { db } from "../firebase.js";
import { useNotifications } from "../hooks/useNotifications.js";
import NotificationsPage from "./NotificationsPage.jsx";
import { disablePushNotifications, enablePushNotifications, PUSH_ENABLED_KEY } from "../services/pushNotifications.js";
import ProfileDrawer from "./ProfileDrawer.jsx";
import SettingsPage from "./SettingsPage.jsx";
import FaqPage from "./FaqPage.jsx";
import AboutPage from "./AboutPage.jsx";
import { exportBackup, readBackupFile, restoreBackup } from "../services/backup.js";

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
  const [inflowModal, setInflowModal] = useState(null);
  const [inflowToDelete, setInflowToDelete] = useState(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [expenseModal, setExpenseModal] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [statusBusy, setStatusBusy] = useState(null);
  const [recurringManagerOpen, setRecurringManagerOpen] = useState(false);
  const [recurringEditor, setRecurringEditor] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [templateBusyId, setTemplateBusyId] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem(PUSH_ENABLED_KEY) === "true");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState(null);
  const [backupToRestore, setBackupToRestore] = useState(null);
  const name = profile?.name || user.email?.split("@")[0] || "User";
  const { inflows, expenses, totals, loading, error } = useBudgetData(
    user.uid,
    selectedMonth,
  );
  const { templates, loading: recurringLoading, error: recurringError } = useRecurringExpenses(user.uid);
  const notificationData = useNotifications(user.uid);
  const currentMonth = getLocalMonthString();

  const saveInflow = async (values) => {
    setMutationError("");
    setMutationBusy(true);
    try {
      if (inflowModal?.id) {
        await updateDoc(doc(db, "users", user.uid, "inflows", inflowModal.id), values);
      } else {
        await addDoc(collection(db, "users", user.uid, "inflows"), { type: "INFLOW", ...values, created: Date.now() });
      }
      setInflowModal(null);
    } finally {
      setMutationBusy(false);
    }
  };

  const deleteInflow = async () => {
    if (!inflowToDelete) return;
    setMutationBusy(true);
    setMutationError("");
    try {
      await deleteDoc(doc(db, "users", user.uid, "inflows", inflowToDelete.id));
      setInflowToDelete(null);
    } catch (deleteError) {
      console.error("Unable to delete inflow:", deleteError);
      setMutationError("Unable to delete the inflow. Please try again.");
      setInflowToDelete(null);
    } finally {
      setMutationBusy(false);
    }
  };

  const saveExpense = async (values) => {
    setMutationBusy(true);
    setMutationError("");
    try {
      if (expenseModal?.id) {
        await updateDoc(doc(db, "users", user.uid, "expenses", expenseModal.id), values);
      } else {
        await addDoc(collection(db, "users", user.uid, "expenses"), { type: "EXPENSE", ...values, created: Date.now() });
      }
      setExpenseModal(null);
    } finally {
      setMutationBusy(false);
    }
  };

  const deleteExpense = async () => {
    if (!expenseToDelete) return;
    setMutationBusy(true);
    setMutationError("");
    try {
      await deleteDoc(doc(db, "users", user.uid, "expenses", expenseToDelete.id));
      setExpenseToDelete(null);
    } catch (deleteError) {
      console.error("Unable to delete expense:", deleteError);
      setMutationError("Unable to delete the expense. Please try again.");
      setExpenseToDelete(null);
    } finally {
      setMutationBusy(false);
    }
  };

  const updateExpenseStatus = async (expense, status) => {
    setStatusBusy(expense.id);
    setMutationError("");
    try {
      await updateDoc(doc(db, "users", user.uid, "expenses", expense.id), { status });
    } catch (statusError) {
      console.error("Unable to update expense status:", statusError);
      setMutationError("Unable to update the expense status. Please try again.");
    } finally {
      setStatusBusy(null);
    }
  };

  const openRecurringEditor = (template = {}) => {
    setRecurringManagerOpen(false);
    setRecurringEditor(template);
  };

  const closeRecurringEditor = () => {
    setRecurringEditor(null);
    setRecurringManagerOpen(true);
  };

  const saveRecurringTemplate = async (values) => {
    setMutationBusy(true);
    setMutationError("");
    try {
      if (recurringEditor?.id) {
        await updateDoc(doc(db, "users", user.uid, "recurringExpenses", recurringEditor.id), { desc: values.desc, amount: values.amount });
      } else {
        await addDoc(collection(db, "users", user.uid, "recurringExpenses"), { ...values, active: true, created: Date.now() });
      }
      setRecurringEditor(null);
      setRecurringManagerOpen(true);
    } finally {
      setMutationBusy(false);
    }
  };

  const toggleRecurringTemplate = async (template) => {
    setTemplateBusyId(template.id);
    setMutationError("");
    try {
      await updateDoc(doc(db, "users", user.uid, "recurringExpenses", template.id), { active: !template.active });
    } catch (toggleError) {
      console.error("Unable to update recurring template:", toggleError);
      setMutationError("Unable to update the recurring expense. Please try again.");
    } finally {
      setTemplateBusyId(null);
    }
  };

  const requestTemplateDelete = (template) => {
    setRecurringManagerOpen(false);
    setTemplateToDelete(template);
  };

  const deleteRecurringTemplate = async () => {
    if (!templateToDelete) return;
    setMutationBusy(true);
    setMutationError("");
    try {
      await deleteDoc(doc(db, "users", user.uid, "recurringExpenses", templateToDelete.id));
      setTemplateToDelete(null);
      setRecurringManagerOpen(true);
    } catch (deleteError) {
      console.error("Unable to delete recurring template:", deleteError);
      setMutationError("Unable to delete the recurring template. Please try again.");
      setTemplateToDelete(null);
    } finally {
      setMutationBusy(false);
    }
  };

  const togglePushNotifications = async (enabled) => {
    setPushBusy(true);
    setPushMessage(null);
    try {
      if (enabled) {
        await enablePushNotifications(user.uid);
        setPushEnabled(true);
        setPushMessage({ type: "success", text: "Push notifications are enabled on this device." });
      } else {
        await disablePushNotifications(user.uid);
        setPushEnabled(false);
        setPushMessage({ type: "success", text: "Push notifications are disabled on this device." });
      }
    } catch (pushError) {
      console.error("Push notification error:", pushError);
      localStorage.setItem(PUSH_ENABLED_KEY, "false");
      setPushEnabled(false);
      setPushMessage({ type: "error", text: pushError.message || "Unable to update push notifications." });
    } finally {
      setPushBusy(false);
    }
  };

  const openNotifications = () => {
    setDrawerOpen(false);
    setSettingsOpen(false);
    setNotificationsOpen(true);
  };

  const openRecurringManager = () => {
    setDrawerOpen(false);
    setSettingsOpen(false);
    setRecurringManagerOpen(true);
  };

  const openSettings = () => {
    setDrawerOpen(false);
    setSettingsOpen(true);
  };

  const requestLogout = () => {
    setDrawerOpen(false);
    setSettingsOpen(false);
    setConfirmLogout(true);
  };

  const confirmSignOut = async () => {
    setLogoutBusy(true);
    try { await onSignOut(); } finally { setLogoutBusy(false); }
  };

  const handleExportBackup = async () => {
    setBackupBusy(true);
    setBackupMessage(null);
    try {
      await exportBackup(user.uid);
      setBackupMessage({ type: "success", text: "Backup exported successfully." });
    } catch (backupError) {
      console.error("Backup export error:", backupError);
      setBackupMessage({ type: "error", text: "Unable to export your backup. Please try again." });
    } finally {
      setBackupBusy(false);
    }
  };

  const handleRestoreFile = async (file) => {
    setBackupMessage(null);
    try {
      const backup = await readBackupFile(file);
      setBackupToRestore({ fileName: file.name, backup });
    } catch (backupError) {
      console.error("Backup validation error:", backupError);
      setBackupMessage({ type: "error", text: backupError.message || "Invalid backup file." });
    }
  };

  const confirmRestoreBackup = async () => {
    if (!backupToRestore) return;
    setBackupBusy(true);
    setBackupMessage(null);
    try {
      await restoreBackup(user.uid, backupToRestore.backup);
      setBackupMessage({ type: "success", text: "Backup restored successfully." });
      setBackupToRestore(null);
    } catch (backupError) {
      console.error("Backup restore error:", backupError);
      setBackupMessage({ type: "error", text: "Unable to restore the backup. Your latest Firestore state will remain visible." });
      setBackupToRestore(null);
    } finally {
      setBackupBusy(false);
    }
  };

  const openFaq = () => { setSettingsOpen(false); setAboutOpen(false); setFaqOpen(true); };
  const openAbout = () => { setSettingsOpen(false); setFaqOpen(false); setAboutOpen(true); };

  return (
    <main className="dashboard-shell">
      <header className="dashboard-topbar">
        <div>
          <p className="eyebrow">Bantay Budget</p>
          <h1>{getGreeting()}, {name} 👋</h1>
        </div>
        <div className="topbar-actions">
          <button className="notification-button" type="button" onClick={() => setNotificationsOpen(true)} aria-label={`${notificationData.unreadCount} unread notifications`}>
            🔔
            {notificationData.unreadCount > 0 && <span>{notificationData.unreadCount > 99 ? "99+" : notificationData.unreadCount}</span>}
          </button>
          <button className="compact-theme-button" type="button" onClick={onToggleTheme} aria-label={`Use ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className="profile-initial" type="button" onClick={() => setDrawerOpen(true)} aria-label={`Open ${name} account menu`}>
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
          <div className="dashboard-controls">
            <label className="month-filter">
              <span>Month</span>
              <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
            </label>
            <button className="add-inflow-button" type="button" onClick={() => setInflowModal({})}>+ Add Inflow</button>
            <button className="add-expense-button" type="button" onClick={() => setExpenseModal({})}>+ Add Expense</button>
            <button className="manage-recurring-button" type="button" onClick={() => setRecurringManagerOpen(true)}>↻ Recurring</button>
          </div>
        </div>

        {error && <div className="form-message error dashboard-error" role="alert">{error}</div>}
        {mutationError && <div className="form-message error dashboard-error" role="alert">{mutationError}</div>}
        {recurringError && <div className="form-message error dashboard-error" role="alert">{recurringError}</div>}

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
            <TransactionsSection inflows={inflows} expenses={expenses} selectedMonth={selectedMonth} currentMonth={currentMonth} onEditInflow={setInflowModal} onDeleteInflow={setInflowToDelete} onEditExpense={setExpenseModal} onDeleteExpense={setExpenseToDelete} onEditGeneratedExpense={setExpenseModal} onDeleteGeneratedExpense={setExpenseToDelete} onExpenseStatusChange={updateExpenseStatus} statusBusy={statusBusy} />
          </>
        )}
      </section>
      {inflowModal && <InflowModal inflow={inflowModal.id ? inflowModal : null} busy={mutationBusy} onClose={() => setInflowModal(null)} onSave={saveInflow} />}
      {expenseModal && <ExpenseModal expense={expenseModal.id ? expenseModal : null} busy={mutationBusy} onClose={() => setExpenseModal(null)} onSave={saveExpense} />}
      {inflowToDelete && <ConfirmDialog title="Delete Inflow?" message={`Opps! Sure ka idelete ang ${inflowToDelete.desc || "inflow"}?`} busy={mutationBusy} onCancel={() => setInflowToDelete(null)} onConfirm={deleteInflow} />}
      {expenseToDelete && <ConfirmDialog title={expenseToDelete.recurring ? "Delete Generated Expense?" : "Delete Expense?"} message={expenseToDelete.recurring ? `Delete this month's generated ${expenseToDelete.desc || "expense"}? If its template remains active, Bantay Budget may generate it again on a later app start.` : `Opps! Sure ka idelete ang ${expenseToDelete.desc || "expense"}?`} busy={mutationBusy} onCancel={() => setExpenseToDelete(null)} onConfirm={deleteExpense} />}
      {recurringManagerOpen && <RecurringManager templates={templates} loading={recurringLoading} busyId={templateBusyId} onClose={() => setRecurringManagerOpen(false)} onAdd={() => openRecurringEditor({})} onEdit={openRecurringEditor} onToggle={toggleRecurringTemplate} onDelete={requestTemplateDelete} />}
      {recurringEditor && <RecurringTemplateModal template={recurringEditor.id ? recurringEditor : null} busy={mutationBusy} onClose={closeRecurringEditor} onSave={saveRecurringTemplate} />}
      {templateToDelete && <ConfirmDialog title="Delete Recurring Template?" message={`Delete ${templateToDelete.desc}? Existing generated monthly expenses will remain in your history.`} busy={mutationBusy} onCancel={() => { setTemplateToDelete(null); setRecurringManagerOpen(true); }} onConfirm={deleteRecurringTemplate} />}
      {notificationsOpen && <NotificationsPage {...notificationData} pushEnabled={pushEnabled} pushBusy={pushBusy} pushMessage={pushMessage} onClose={() => setNotificationsOpen(false)} onTogglePush={togglePushNotifications} onMarkRead={notificationData.markRead} onMarkAllRead={notificationData.markAllRead} onClearOld={notificationData.clearOld} />}
      {drawerOpen && <ProfileDrawer name={name} email={user.email} theme={theme} unreadCount={notificationData.unreadCount} onClose={() => setDrawerOpen(false)} onNotifications={openNotifications} onRecurring={openRecurringManager} onSettings={openSettings} onToggleTheme={onToggleTheme} onLogout={requestLogout} />}
      {settingsOpen && <SettingsPage name={name} email={user.email} theme={theme} pushEnabled={pushEnabled} unreadCount={notificationData.unreadCount} backupBusy={backupBusy} backupMessage={backupMessage} onClose={() => setSettingsOpen(false)} onToggleTheme={onToggleTheme} onNotifications={openNotifications} onRecurring={openRecurringManager} onExportBackup={handleExportBackup} onRestoreFile={handleRestoreFile} onFaq={openFaq} onAbout={openAbout} onLogout={requestLogout} />}
      {confirmLogout && <ConfirmDialog title="Sign Out?" message="Are you sure you want to sign out of Bantay Budget on this device?" busy={logoutBusy} onCancel={() => setConfirmLogout(false)} onConfirm={confirmSignOut} />}
      {backupToRestore && <ConfirmDialog title="Restore Backup?" message={`Replace your current inflows, expenses, and recurring expenses using ${backupToRestore.fileName}? This cannot be undone unless you export your current data first.`} busy={backupBusy} onCancel={() => setBackupToRestore(null)} onConfirm={confirmRestoreBackup} />}
      {faqOpen && <FaqPage onClose={() => { setFaqOpen(false); setSettingsOpen(true); }} />}
      {aboutOpen && <AboutPage onClose={() => { setAboutOpen(false); setSettingsOpen(true); }} onFaq={openFaq} />}
    </main>
  );
}

export default DashboardPlaceholder;
