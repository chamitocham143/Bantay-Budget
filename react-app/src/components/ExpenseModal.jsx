import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { getLocalDateString } from "../utils/dates.js";

const defaultForm = {
  date: getLocalDateString(),
  desc: "",
  status: "ON HOLD",
  amount: "",
};

function ExpenseModal({ expense, busy, onClose, onSave }) {
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (expense) {
      setForm({
        date: expense.date || getLocalDateString(),
        desc: expense.desc || "",
        status: expense.status || "ON HOLD",
        amount: String(expense.amount ?? ""),
      });
    }
  }, [expense]);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const amount = Number(form.amount);

    if (!form.date || !form.desc.trim() || !form.status || !form.amount) {
      setError("Paki fillout po yung fields.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    try {
      await onSave({
        date: form.date,
        desc: form.desc.trim(),
        status: form.status,
        amount,
      });
    } catch {
      setError("Unable to save the expense. Please try again.");
    }
  };

  return (
    <Modal title={expense ? "Edit Expense" : "Add Expense"} onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        {error && <div className="form-message error" role="alert">{error}</div>}
        <label><span>Date</span><input name="date" type="date" value={form.date} onChange={updateField} /></label>
        <label><span>Description</span><input name="desc" value={form.desc} onChange={updateField} autoFocus /></label>
        <label>
          <span>Status</span>
          <select name="status" value={form.status} onChange={updateField}>
            <option value="ON HOLD">On Hold</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
          </select>
        </label>
        <label><span>Amount</span><input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={updateField} /></label>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="expense-save-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save Expense"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default ExpenseModal;
