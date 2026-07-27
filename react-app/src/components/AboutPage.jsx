import { useEffect, useRef } from "react";

function AboutPage({ developerEnabled, testPushBusy, testPushMessage, onClose, onFaq, onToggleDeveloper, onTestPush }) {
  const pressTimer = useRef(null);
  useEffect(() => { const old = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = old; if (pressTimer.current) window.clearTimeout(pressTimer.current); }; }, []);
  const startDeveloperPress = () => { pressTimer.current = window.setTimeout(onToggleDeveloper, 2000); };
  const cancelDeveloperPress = () => { if (pressTimer.current) window.clearTimeout(pressTimer.current); };
  return (
    <section className="info-page" aria-labelledby="about-title">
      <header className="settings-header"><button type="button" onClick={onClose} aria-label="Close About">←</button><h1 id="about-title">About</h1><span /></header>
      <div className="info-content">
        <div className="info-hero"><img src="/icons/icon-192.png" alt="Bantay Budget" /><h2>Bantay Budget</h2><p>Bantay ngayon, secure bukas.</p><button className="version-trigger" type="button" onMouseDown={startDeveloperPress} onMouseUp={cancelDeveloperPress} onMouseLeave={cancelDeveloperPress} onTouchStart={startDeveloperPress} onTouchEnd={cancelDeveloperPress}>Version 1.0.0</button></div>
        {developerEnabled && <section className="developer-panel"><strong>🛠 Developer Mode</strong><p>Send a test notification through the existing callable Cloud Function.</p><button type="button" disabled={testPushBusy} onClick={onTestPush}>{testPushBusy ? "Sending…" : "Send Test Push"}</button>{testPushMessage && <div className={`form-message ${testPushMessage.type}`}>{testPushMessage.text}</div>}</section>}
        <article className="about-info-card"><h3>About this app</h3><p>Bantay Budget is a personal finance PWA designed to help you track income, expenses, recurring dues, reminders, and your remaining balance.</p></article>
        <button className="about-link-card" type="button" onClick={onFaq}><span>❔</span><div><strong>FAQ’s</strong><small>Find answers to common questions</small></div><i>›</i></button>
        <a className="about-link-card" href="https://reychamdev.vercel.app" target="_blank" rel="noreferrer"><span>👨‍💻</span><div><strong>Developer</strong><small>Created by Reycham Pana</small></div><i>↗</i></a>
        <a className="about-link-card" href="https://bantaybudget.fyi" target="_blank" rel="noreferrer"><span>🌐</span><div><strong>Website</strong><small>bantaybudget.fyi</small></div><i>↗</i></a>
        <footer className="about-footer">© {new Date().getFullYear()} Bantay Budget<br />Designed &amp; Developed with ❤️ by Reycham Pana</footer>
      </div>
    </section>
  );
}

export default AboutPage;
