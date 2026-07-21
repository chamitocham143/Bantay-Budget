export function registerAppServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/firebase-messaging-sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}
