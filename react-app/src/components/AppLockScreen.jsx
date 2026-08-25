import { useEffect, useRef, useState } from "react";

function AppLockScreen({ biometricEnabled, onUnlock, onSignOut }) {
  const unlockButtonRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    unlockButtonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  const handleUnlock = async () => {
    setBusy(true);
    setError("");

    try {
      await onUnlock();
    } catch (unlockError) {
      if (unlockError?.name !== "NotAllowedError") {
        console.error("App unlock failed:", unlockError);
      }
      setError(
        unlockError?.name === "NotAllowedError"
          ? "Authentication was canceled. Try again when you’re ready."
          : unlockError?.message || "Unable to verify this device. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="app-lock-screen" aria-labelledby="lock-title" role="dialog" aria-modal="true">
      <div className="app-lock-card">
        <img src="/icons/icon-512.png" alt="" aria-hidden="true" />
        <p className="eyebrow">Session protected</p>
        <h1 id="lock-title">Bantay Budget Locked</h1>
        <p>
          {biometricEnabled
            ? "Confirm with Face ID or your device security to continue."
            : "Due to inactivity."}
        </p>
        {error && <div className="form-message error" role="alert">{error}</div>}
        <button type="button" onClick={handleUnlock} disabled={busy} ref={unlockButtonRef}>
          {busy ? "Verifying…" : biometricEnabled ? "◉ Unlock with Face ID" : "🔓 Unlock"}
        </button>
        {biometricEnabled && (
          <button className="app-lock-signout" type="button" onClick={onSignOut} disabled={busy}>
            Sign out instead
          </button>
        )}
      </div>
    </section>
  );
}

export default AppLockScreen;
