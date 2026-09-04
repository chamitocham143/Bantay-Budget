import { useState } from "react";
import Modal from "./Modal.jsx";

function DeleteAccountModal({ email, busy, onClose, onSubmit }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!password) {
      setError("Enter your current password.");
      return;
    }

    if (confirmation !== "DELETE") {
      setError("Type DELETE exactly to confirm permanent account deletion.");
      return;
    }

    try {
      await onSubmit(password);
    } catch (submitError) {
      const messages = {
        "auth/invalid-credential": "The current password is incorrect.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/requires-recent-login": "Please sign out, sign back in, and try again.",
        "functions/failed-precondition": "Password verification expired. Please try again.",
      };
      const message = messages[submitError?.code]
        || "Unable to complete account deletion. Please try again.";
      setError(message);
    }
  };

  return (
    <Modal title="Delete Account" onClose={busy ? () => undefined : onClose} className="delete-account-modal">
      <form className="modal-form account-management-form" onSubmit={handleSubmit}>
        <div className="account-delete-warning" role="alert"><strong>This cannot be undone.</strong><p>Your account, financial records, recurring expenses, reminders, registered devices, and server-side Face ID login registrations will be permanently deleted.</p></div>
        <p className="account-modal-copy">Export a backup first if you may need your records later.</p>
        {error && <div className="form-message error" role="alert">{error}</div>}
        <label><span>Account</span><input value={email} disabled /></label>
        <label><span>Current password</span><div className="password-field"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword((shown) => !shown)}>{showPassword ? "Hide" : "Show"}</button></div></label>
        <label><span>Type DELETE to confirm</span><input value={confirmation} autoComplete="off" spellCheck="false" onChange={(event) => setConfirmation(event.target.value)} /></label>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="danger-confirm-button" type="submit" disabled={busy || confirmation !== "DELETE"}>{busy ? "Deleting…" : "Delete Forever"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default DeleteAccountModal;
