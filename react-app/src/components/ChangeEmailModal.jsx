import { useState } from "react";
import Modal from "./Modal.jsx";

function accountErrorMessage(error, fallback) {
  const messages = {
    "auth/email-already-in-use": "That email address is already connected to another account.",
    "auth/invalid-credential": "The current password is incorrect.",
    "auth/invalid-email": "Enter a valid new email address.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/requires-recent-login": "Please sign out, sign back in, and try again.",
  };

  return messages[error?.code] || fallback;
}

function ChangeEmailModal({ currentEmail, busy, onClose, onSubmit }) {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const normalizedEmail = newEmail.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Enter your new email and current password.");
      return;
    }

    if (normalizedEmail === currentEmail.toLowerCase()) {
      setError("Enter an email address different from your current one.");
      return;
    }

    try {
      await onSubmit(normalizedEmail, password);
    } catch (submitError) {
      setError(accountErrorMessage(submitError, "Unable to send the verification email. Please try again."));
    }
  };

  return (
    <Modal title="Change Email" onClose={busy ? () => undefined : onClose}>
      <form className="modal-form account-management-form" onSubmit={handleSubmit}>
        <p className="account-modal-copy">Your email changes only after you approve the verification link sent to the new address.</p>
        {error && <div className="form-message error" role="alert">{error}</div>}
        <label><span>Current email</span><input value={currentEmail} disabled /></label>
        <label><span>New email</span><input type="email" inputMode="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} autoFocus /></label>
        <label><span>Current password</span><div className="password-field"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword((shown) => !shown)}>{showPassword ? "Hide" : "Show"}</button></div></label>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Sending…" : "Verify New Email"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default ChangeEmailModal;

