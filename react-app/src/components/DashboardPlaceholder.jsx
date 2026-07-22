import { useEffect, useState } from "react";
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
import { APP_LOCK_KEY, useInactivityLock } from "../hooks/useInactivityLock.js";
import AppLockScreen from "./AppLockScreen.jsx";
import FinanceTip from "./FinanceTip.jsx";
import { exportMonthlyCsv } from "../services/csvExport.js";
import { usePullToRefresh } from "../hooks/usePullToRefresh.js";
import { sendTestPush } from "../services/developerTools.js";
import BottomActionBar from "./BottomActionBar";
import { useMemo } from "react";

const MONTH_OPTIONS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const YEAR_OPTIONS = Array.from({ length: 101 }, (_, index) => 2000 + index);

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "😴 Tulog Na";
  if (hour < 12) return "🌤️ Maayong Buntag";
  if (hour < 13) return "☀️ Maayong Udto";
  if (hour < 18) return "🌥️ Maayong Hapon";
  if (hour < 22) return "🌙 Maayong Gabi-i";
  return "✨ Good Night";
}

function getPreviousMonth(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);

  const date = new Date(year, month - 2, 1);

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
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
  const [appLockEnabled, setAppLockEnabled] = useState(() => localStorage.getItem(APP_LOCK_KEY) === "true");
  const [actionMessage, setActionMessage] = useState(null);
  const [developerEnabled, setDeveloperEnabled] = useState(false);
  const [testPushBusy, setTestPushBusy] = useState(false);
  const [testPushMessage, setTestPushMessage] = useState(null);
  const name = profile?.name || user.email?.split("@")[0] || "User";
  const { inflows, expenses, totals, loading, error } = useBudgetData(
    user.uid,
    selectedMonth,
  );

  const previousMonth = getPreviousMonth(selectedMonth);
  const {
    totals: previousTotals,
    loading: previousMonthLoading,
  } = useBudgetData(user.uid, previousMonth);

  const { templates, loading: recurringLoading, error: recurringError } = useRecurringExpenses(user.uid);
  const notificationData = useNotifications(user.uid);
  const currentMonth = getLocalMonthString();
  const [selectedYear, selectedMonthNumber] = selectedMonth.split("-");
  const { locked: appLocked, unlock: unlockApp } = useInactivityLock(appLockEnabled);
  const { targetRef: pullTargetRef, pulling, refreshing } = usePullToRefresh();
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

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
  const toggleAppLock = (enabled) => {
    localStorage.setItem(APP_LOCK_KEY, String(enabled));
    setAppLockEnabled(enabled);
  };

  const handleCsvExport = () => {
    setDrawerOpen(false);
    setActionMessage(null);
    try {
      exportMonthlyCsv(selectedMonth || currentMonth, inflows, expenses);
      setActionMessage({ type: "success", text: `CSV exported for ${selectedMonth || currentMonth}.` });
    } catch (csvError) {
      setActionMessage({ type: "error", text: csvError.message || "Unable to export CSV." });
    }
  };

  const handleTestPush = async () => {
    setTestPushBusy(true);
    setTestPushMessage(null);
    try {
      await sendTestPush();
      setTestPushMessage({ type: "success", text: "Test push notification sent." });
    } catch (testError) {
      console.error("Test push error:", testError);
      setTestPushMessage({ type: "error", text: testError.message || "Unable to send a test push." });
    } finally {
      setTestPushBusy(false);
    }
  };

  const formatFilterMonth = (monthValue) => {
  const [year, month] = monthValue.split("-");

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(year), Number(month) - 1, 1));
};

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount) || 0);

// Getting Previous Month Value //


const getBalanceTrend = () => {
  const current = Number(totals?.available || 0);
  const previous = Number(previousTotals?.available || 0);

  const previousHasData =
    Number(previousTotals?.inflowTotal || 0) !== 0 ||
    Number(previousTotals?.paidTotal || 0) !== 0 ||
    Number(previousTotals?.pendingTotal || 0) !== 0 ||
    Number(previousTotals?.onHoldTotal || 0) !== 0;

  if (previousMonthLoading) {
    return {
      direction: "neutral",
      percentage: null,
      difference: 0,
      label: "Loading trend",
    };
  }

  if (!previousHasData) {
    return {
      direction: "neutral",
      percentage: null,
      difference: current,
      label: "No previous data",
    };
  }

  const difference = current - previous;

  if (previous === 0) {
    return {
      direction:
        difference > 0
          ? "up"
          : difference < 0
          ? "down"
          : "neutral",
      percentage: null,
      difference,
      label: "vs last month",
    };
  }

  const percentage = Math.round(
    (Math.abs(difference) / Math.abs(previous)) * 100
  );

  return {
    direction:
      difference > 0
        ? "up"
        : difference < 0
        ? "down"
        : "neutral",
    percentage,
    difference,
    label: "vs last month",
  };
};

const balanceTrend = getBalanceTrend();

//*********************************************** */

const getBalanceMessage = () => {
  const available = Number(totals?.available || 0);
  const pending = Number(totals?.pendingTotal || 0);
  const onHold = Number(totals?.onHoldTotal || 0);

  if (available < 0) {
    return "Your expenses are currently above your available balance.";
  }

  if (available === 0) {
    return "Your available balance is fully allocated this month.";
  }

  if (pending > available) {
    return "You have upcoming payments that need your attention.";
  }

  if (onHold > 0) {
    return `${formatCurrency(onHold)} is currently on hold.`;
  }

  return "You're doing great this month.";
};

const getFinancialHealth = () => {
  const income = Number(totals?.inflowTotal || 0);
  const paid = Number(totals?.paidTotal || 0);
  const pending = Number(totals?.pendingTotal || 0);
  const onHold = Number(totals?.onHoldTotal || 0);
  const available = Number(totals?.available || 0);

  if (income <= 0) {
    return {
      score: 0,
      status: "Getting Started",
      tone: "info",
      insights: [
        {
          type: "info",
          icon: "fa-solid fa-wallet",
          text: "Add your monthly income to calculate your financial health.",
        },
      ],
    };
  }

  const availablePercentage = Math.round((available / income) * 100);
  const paidPercentage = Math.round((paid / income) * 100);
  const pendingPercentage = Math.round((pending / income) * 100);

  let score = 100;

  if (available < 0) {
    score -= 50;
  } else if (availablePercentage < 10) {
    score -= 30;
  } else if (availablePercentage < 25) {
    score -= 15;
  }

  if (pending > available) {
    score -= 25;
  }

  if (paidPercentage > 80) {
    score -= 15;
  } else if (paidPercentage > 65) {
    score -= 8;
  }

  if (onHold > 0) {
    score -= 5;
  }

  score = Math.max(0, Math.min(100, score));

  let status = "Excellent";
  let tone = "success";

  if (score < 40) {
    status = "Needs Attention";
    tone = "danger";
  } else if (score < 65) {
    status = "Fair";
    tone = "warning";
  } else if (score < 85) {
    status = "Good";
    tone = "success";
  }

  const insights = [];

  if (available < 0) {
    insights.push({
      type: "danger",
      icon: "fa-solid fa-triangle-exclamation",
      text: `Your budget is over by ${formatCurrency(
        Math.abs(available)
      )}.`,
    });
  } else {
    insights.push({
      type: availablePercentage >= 25 ? "success" : "warning",
      icon: "fa-solid fa-wallet",
      text: `${Math.max(
        availablePercentage,
        0
      )}% of your income is still available.`,
    });
  }

  if (pending <= 0) {
    insights.push({
      type: "success",
      icon: "fa-solid fa-calendar-check",
      text: "You currently have no pending payments.",
    });
  } else if (available >= pending) {
    insights.push({
      type: "success",
      icon: "fa-solid fa-shield-halved",
      text: "Your available balance can cover all pending payments.",
    });
  } else {
    insights.push({
      type: "warning",
      icon: "fa-solid fa-clock",
      text: `${formatCurrency(
        pending - Math.max(available, 0)
      )} more may be needed for pending payments.`,
    });
  }

  if (paidPercentage > 70) {
    insights.push({
      type: "warning",
      icon: "fa-solid fa-chart-pie",
      text: `${paidPercentage}% of your income has already been spent.`,
    });
  } else {
    insights.push({
      type: "success",
      icon: "fa-solid fa-chart-line",
      text: "Your paid expenses remain within a healthy range.",
    });
  }

  if (onHold > 0 && insights.length < 3) {
    insights.push({
      type: "info",
      icon: "fa-solid fa-pause",
      text: `${formatCurrency(onHold)} is currently on hold.`,
    });
  }

  return {
    score,
    status,
    tone,
    insights: insights.slice(0, 3),
  };
};

const financialHealth = getFinancialHealth();

const [animatedFinancialScore, setAnimatedFinancialScore] = useState(0);

useEffect(() => {
  const targetScore = Math.max(
    0,
    Math.min(100, Number(financialHealth.score) || 0)
  );

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    setAnimatedFinancialScore(targetScore);
    return;
  }

  const duration = 1200;
  let animationFrame;
  let startTime;

  setAnimatedFinancialScore(0);

  const animateScore = (timestamp) => {
    if (!startTime) {
      startTime = timestamp;
    }

    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Smooth ease-out animation
    const easedProgress = 1 - Math.pow(1 - progress, 3);

    setAnimatedFinancialScore(
      Math.round(targetScore * easedProgress)
    );

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animateScore);
    }
  };

  animationFrame = requestAnimationFrame(animateScore);

  return () => {
    cancelAnimationFrame(animationFrame);
  };
}, [financialHealth.score]);

const getMonthOptions = () => {
  const options = [];
  const current = new Date();
  const currentYear = current.getFullYear();
  const currentMonthIndex = current.getMonth();

  for (let index = 0; index < 24; index += 1) {
    const date = new Date(currentYear, currentMonthIndex - index, 1);

    const value = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    options.push({
      value,
      label: new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(date),
    });
  }

  return options;
};

const monthOptions = getMonthOptions();

  return (
    <main className={`dashboard-shell ${pulling || refreshing ? "pulling" : ""}`} ref={pullTargetRef}>
      <div className={`pull-refresh-indicator ${pulling || refreshing ? "active" : ""}`} aria-hidden={!pulling && !refreshing}><span>↻</span>{refreshing ? "Refreshing live data…" : "Release to refresh"}</div>
      <header className="dashboard-topbar">
        <div>
        <p className="eyebrow">Bantay Budget</p>
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

            <section className="balance-hero">
        <div className="balance-hero-glow" aria-hidden="true" />

        <div className="balance-hero-content">
          <p className="balance-hero-greeting">
            {getGreeting()}, {name} 👋
          </p>

          <h1 className="balance-hero-amount">
            {formatCurrency(totals?.available)}
          </h1>

          <p className="balance-hero-label">
            Available Balance
          </p>

          <p className="balance-hero-message">
            {getBalanceMessage()}
          </p>
        </div>

        <div className={`balance-trend-card ${balanceTrend.direction}`}>
  <div className="balance-trend-value">
    <span className="balance-trend-arrow">
      {balanceTrend.direction === "up" && "↗"}
      {balanceTrend.direction === "down" && "↘"}
      {balanceTrend.direction === "neutral" && "→"}
    </span>

    <strong>
      {balanceTrend.percentage === null
        ? "—"
        : `${balanceTrend.percentage}%`}
    </strong>
  </div>

  <span className="balance-trend-label">
    {balanceTrend.label}
  </span>
</div>

      </section>

      <div className="financial-health-grid">

  <div className="financial-score-card">

  <div
    className="financial-health-score"
    role="progressbar"
    aria-label="Financial Score"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={financialHealth.score}
    style={{
      "--health-score": `${animatedFinancialScore * 3.6}deg`,
    }}
  >
    <div className="financial-health-score-inner">
      <strong>{animatedFinancialScore}</strong>
    </div>
  </div>

  <p className="financial-score-label">
    Financial Score
  </p>

  <h3 className={`financial-score-title ${financialHealth.tone}`}>
    {financialHealth.status}
  </h3>

</div>

  <div className="financial-summary-card">

    <h3>Health Summary</h3>

    <div className="financial-insights-list">

      {financialHealth.insights.map((insight, index) => (

        <div
          className={`financial-insight-item ${insight.type}`}
          key={index}
        >
          <span className="financial-insight-status">
            <i className={insight.icon}></i>
          </span>

          <p>{insight.text}</p>

        </div>

      ))}

    </div>

  </div>

</div>

      <section className="dashboard-content">

          <div className="premium-overview-heading">
  <p className="premium-overview-kicker">
    Financial Overview
  </p>

  <div className="premium-overview-title-row">
    <h2>Your monthly budget</h2>

  <div className="premium-month-picker">
  
              <button
          type="button"
          className="premium-month-picker-button"
          onClick={() => setMonthPickerOpen(true)}
        >
          <span className="premium-month-picker-label">
            📅 {formatFilterMonth(selectedMonth)}
          </span>

          <span className="premium-month-picker-chevron">
            ▼
          </span>
        </button>

        </div>
          </div>

            <BottomActionBar
              onAddInflow={() => setInflowModal({})}
              onAddExpense={() => setExpenseModal({})}
              onRecurring={() => setRecurringManagerOpen(true)}
            />
            
          </div>

        {error && <div className="form-message error dashboard-error" role="alert">{error}</div>}
        {mutationError && <div className="form-message error dashboard-error" role="alert">{mutationError}</div>}
        {recurringError && <div className="form-message error dashboard-error" role="alert">{recurringError}</div>}
        {actionMessage && <div className={`form-message ${actionMessage.type} dashboard-error`} role="status">{actionMessage.text}</div>}

        {loading ? (
          <section className="dashboard-loading" aria-live="polite">
            <div className="loading-dots" aria-hidden="true"><span /><span /><span /></div>
            <p>Loading your financial overview…</p>
          </section>
        ) : (
          <>
            <SummaryDashboard totals={totals} />
            <FinanceTip />
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
      {drawerOpen && <ProfileDrawer name={name} email={user.email} theme={theme} unreadCount={notificationData.unreadCount} onClose={() => setDrawerOpen(false)} onNotifications={openNotifications} onRecurring={openRecurringManager} onExportCsv={handleCsvExport} onSettings={openSettings} onToggleTheme={onToggleTheme} onLogout={requestLogout} />}
      {settingsOpen && <SettingsPage name={name} email={user.email} theme={theme} pushEnabled={pushEnabled} appLockEnabled={appLockEnabled} unreadCount={notificationData.unreadCount} backupBusy={backupBusy} backupMessage={backupMessage} onClose={() => setSettingsOpen(false)} onToggleTheme={onToggleTheme} onToggleAppLock={toggleAppLock} onNotifications={openNotifications} onRecurring={openRecurringManager} onExportCsv={handleCsvExport} onExportBackup={handleExportBackup} onRestoreFile={handleRestoreFile} onFaq={openFaq} onAbout={openAbout} onLogout={requestLogout} />}
      {confirmLogout && <ConfirmDialog title="Sign Out?" message="Are you sure you want to sign out of Bantay Budget on this device?" busy={logoutBusy} onCancel={() => setConfirmLogout(false)} onConfirm={confirmSignOut} />}
      {backupToRestore && <ConfirmDialog title="Restore Backup?" message={`Replace your current inflows, expenses, and recurring expenses using ${backupToRestore.fileName}? This cannot be undone unless you export your current data first.`} busy={backupBusy} onCancel={() => setBackupToRestore(null)} onConfirm={confirmRestoreBackup} />}
      {faqOpen && <FaqPage onClose={() => { setFaqOpen(false); setSettingsOpen(true); }} />}
      {aboutOpen && <AboutPage developerEnabled={developerEnabled} testPushBusy={testPushBusy} testPushMessage={testPushMessage} onClose={() => { setAboutOpen(false); setSettingsOpen(true); }} onFaq={openFaq} onToggleDeveloper={() => { setDeveloperEnabled((enabled) => !enabled); setTestPushMessage(null); }} onTestPush={handleTestPush} />}
      {appLocked && <AppLockScreen onUnlock={unlockApp} />}

        {monthPickerOpen && (
  <div
    className="month-picker-overlay"
    role="presentation"
    onClick={() => setMonthPickerOpen(false)}
  >
    <section
      className="month-picker-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="month-picker-title"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="month-picker-header">
        <div>
          <p className="month-picker-kicker">Budget period</p>
          <h2 id="month-picker-title">Select month</h2>
        </div>

        <button
          type="button"
          className="month-picker-close"
          onClick={() => setMonthPickerOpen(false)}
          aria-label="Close month picker"
        >
          ×
        </button>
      </div>

      <div className="month-picker-list">
        {monthOptions.map((option) => {
          const active = option.value === selectedMonth;

          return (
            <button
              type="button"
              key={option.value}
              className={`month-picker-option ${
                active ? "active" : ""
              }`}
              onClick={() => {
                setSelectedMonth(option.value);
                setMonthPickerOpen(false);
              }}
            >
              <span>{option.label}</span>

              {active && (
                <span className="month-picker-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  </div>
)}

    </main>
  );
}

export default DashboardPlaceholder;
