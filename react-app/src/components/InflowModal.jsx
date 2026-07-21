import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { getLocalDateString } from "../utils/dates.js";

function InflowModal({ inflow, busy, onClose, onSave }) {
  const [form, setForm] = useState({ date: getLocalDateString(), desc: "", amount: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (inflow) {
      setForm({ date: inflow.date || getLocalDateString(), desc: inflow.desc || "", amount: String(inflow.amount ?? "") });
    }
  }, [inflow]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const amount = Number(form.amount);

    if (!form.date || !form.desc.trim() || !form.amount) {
      setError("Paki fillout po yung fields.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    try {
      await onSave({ date: form.date, desc: form.desc.trim(), amount });
    } catch {
      setError("Unable to save the inflow. Please try again.");
    }
  };

  return (
    <Modal title={inflow ? "Edit Inflow" : "Add Inflow"} onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        {error && <div className="form-message error" role="alert">{error}</div>}
        <label><span>Date</span><input name="date" type="date" value={form.date} onChange={updateField} /></label>
        <label><span>Description</span><input name="desc" value={form.desc} onChange={updateField} autoFocus /></label>
        <label><span>Amount</span><input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={updateField} /></label>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save Inflow"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default InflowModal;
