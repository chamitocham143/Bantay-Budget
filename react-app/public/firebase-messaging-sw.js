importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDzB2BPPUZLfCNpIEM2JR7VeS8rPwSjzTs",
  authDomain: "expenses-monitoring-4540e.firebaseapp.com",
  projectId: "expenses-monitoring-4540e",
  storageBucket: "expenses-monitoring-4540e.firebasestorage.app",
  messagingSenderId: "1087776652368",
  appId: "1:1087776652368:web:6168ac2e6c88517d96a555",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(async (payload) => {
  console.log("Background message received:", payload);

  const unreadCount = Number(
    payload.data?.unreadCount || 0
  );

  try {
    if (
      unreadCount > 0 &&
      self.navigator.setAppBadge
    ) {
      await self.navigator.setAppBadge(unreadCount);
    } else if (self.navigator.clearAppBadge) {
      await self.navigator.clearAppBadge();
    }
  } catch (error) {
    console.warn(
      "Unable to update background app badge:",
      error
    );
  }
});

const CACHE_NAME = "bantay-budget-react-v2";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    const indexResponse = await fetch("/index.html", { cache: "no-store" });
    const indexMarkup = await indexResponse.text();
    const assetUrls = [...indexMarkup.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map((match) => match[1]);
    await cache.addAll(assetUrls);
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
      return cached || network;
    }),
  );
});
