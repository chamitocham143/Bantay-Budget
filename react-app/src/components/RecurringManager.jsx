import Modal from "./Modal.jsx";
import { formatCurrency } from "./SummaryDashboard.jsx";

function RecurringManager({ templates, loading, busyId, onClose, onAdd, onEdit, onToggle, onDelete }) {
  return (
    <Modal title="Manage Recurring" onClose={onClose}>
      <div className="recurring-manager-toolbar">
        <p>Templates automatically create one duplicate-safe expense each month.</p>
        <button className="primary-button" type="button" onClick={onAdd}>+ Add Recurring</button>
      </div>
      {loading ? (
        <div className="manager-loading">Loading recurring expenses…</div>
      ) : templates.length === 0 ? (
        <div className="transaction-empty compact"><span aria-hidden="true">↻</span><h3>No recurring expenses</h3><p>Add your first monthly bill or payment.</p></div>
      ) : (
        <div className="recurring-template-list">
          {templates.map((template) => (
            <article className="recurring-template-card" key={template.id}>
              <div>
                <h3>{template.desc}</h3>
                <p>Day {template.recurringDay} · {formatCurrency(template.amount)}</p>
                <span className={`template-state ${template.active ? "active" : "paused"}`}>{template.active ? "● Active" : "Ⅱ Paused"}</span>
              </div>
              <div className="template-actions">
                <button type="button" onClick={() => onEdit(template)} aria-label={`Edit ${template.desc}`}>✎</button>
                <button type="button" onClick={() => onToggle(template)} disabled={busyId === template.id}>{template.active ? "Pause" : "Resume"}</button>
                <button className="template-delete" type="button" onClick={() => onDelete(template)} aria-label={`Delete ${template.desc}`}>⌫</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default RecurringManager;
