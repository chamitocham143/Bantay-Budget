import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";

function RecurringTemplateModal({ template, busy, onClose, onSave }) {
  const [form, setForm] = useState({ desc: "", amount: "", recurringDay: "1" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (template) {
      setForm({ desc: template.desc || "", amount: String(template.amount ?? ""), recurringDay: String(template.recurringDay || 1) });
    }
  }, [template]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const amount = Number(form.amount);
    const recurringDay = Number(form.recurringDay);

    if (!form.desc.trim() || !form.amount || !recurringDay) {
      setError("Paki fillout po yung fields.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    try {
      await onSave({ desc: form.desc.trim(), amount, recurringDay });
    } catch {
      setError("Unable to save the recurring expense. Please try again.");
    }
  };

  return (
    <Modal title={template ? "Edit Recurring Expense" : "Add Recurring Expense"} onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        {error && <div className="form-message error" role="alert">{error}</div>}
        <label><input name="desc" value={form.desc} placeholder="Description" onChange={updateField} autoFocus /></label>
        <label><input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} placeholder="Amount" onChange={updateField} /></label>
        <label>
          <span>Due day</span>
          <select name="recurringDay" value={form.recurringDay} onChange={updateField} disabled={Boolean(template)}>
            {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option value={day} key={day}>Day {day}</option>)}
          </select>
        </label>
        {template && <p className="field-help">The due day is locked after creation to protect generated monthly records.</p>}
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save Recurring"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default RecurringTemplateModal;
