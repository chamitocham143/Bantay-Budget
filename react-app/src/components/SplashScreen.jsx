function SplashScreen() {
  return (
    <main
      className="splash-screen"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="splash-content">
        <div className="brand-mark splash-mark" aria-hidden="true">
          BB
        </div>

        <h1>Bantay Budget</h1>

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