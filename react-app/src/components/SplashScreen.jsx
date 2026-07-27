function SplashScreen() {
  return (
    <main
      className="splash-screen"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="splash-content">
         <div className="brand-mark" aria-hidden="true">
          <img src="/icons/icon-192.png" alt="" />
        </div>

        <h2>Bantay Budget</h2>

        <div className="splash-loading">
          <p>Wait lang po</p>

          <div className="loading-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </main>
  );
}

export default SplashScreen;