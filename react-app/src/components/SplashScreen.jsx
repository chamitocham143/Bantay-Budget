function SplashScreen() {
  return (
    <main className="splash-screen" aria-live="polite" aria-busy="true">
      <div className="brand-mark splash-mark" aria-hidden="true">
        BB
      </div>
      <h1>Bantay Budget</h1>
      <p>Loading your budget</p>
      <div className="loading-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}

export default SplashScreen;
