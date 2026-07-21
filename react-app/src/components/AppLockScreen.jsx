import { useEffect, useRef } from "react";

function AppLockScreen({ onUnlock }) {
  const unlockButtonRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    unlockButtonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return (
    <section className="app-lock-screen" aria-labelledby="lock-title" role="dialog" aria-modal="true">
      <div className="app-lock-card">
        <img src="/icons/icon-512.png" alt="" aria-hidden="true" />
        <p className="eyebrow">Session protected</p>
        <h1 id="lock-title">Bantay Budget Locked</h1>
        <p>No activity was detected for three minutes.</p>
        <button type="button" onClick={onUnlock} ref={unlockButtonRef}>🔓 Unlock</button>
      </div>
    </section>
  );
}

export default AppLockScreen;
