import Modal from "./Modal.jsx";

function ConfirmDialog({ title, message, busy, onCancel, onConfirm }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="confirm-content">
        <div className="confirm-icon" aria-hidden="true">!</div>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>No, keep it</button>
          <button className="delete-button" type="button" onClick={onConfirm} disabled={busy}>{busy ? "Deleting…" : "Yes, delete"}</button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
