import { useEffect } from "react";

function AboutPage({ onClose, onFaq }) {
  useEffect(() => { const old = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = old; }; }, []);
  return (
    <section className="info-page" aria-labelledby="about-title">
      <header className="settings-header"><button type="button" onClick={onClose} aria-label="Close About">←</button><h1 id="about-title">About</h1><span /></header>
      <div className="info-content">
        <div className="info-hero"><img src="/icons/icon-192.png" alt="Bantay Budget" /><h2>Bantay Budget</h2><p>Bantay ngayon, secure bukas.</p><span>Version 1.0.0 · React migration preview</span></div>
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
