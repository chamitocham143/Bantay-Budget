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
  const name = profile?.name || user.email?.split("@")[0] || "User";
  const { inflows, expenses, totals, loading, error } = useBudgetData(
    user.uid,
    selectedMonth,
  );
  const { templates, loading: recurringLoading, error: recurringError } = useRecurringExpenses(user.uid);
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
    </main>
  );
}

export default DashboardPlaceholder;
