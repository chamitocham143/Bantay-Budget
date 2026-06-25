importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);

firebase.initializeApp({

  apiKey: "AIzaSyDzB2BPPUZLfCNpIEM2JR7VeS8rPwSjzTs",
  authDomain: "expenses-monitoring-4540e.firebaseapp.com",
  projectId: "expenses-monitoring-4540e",
  storageBucket: "expenses-monitoring-4540e.firebasestorage.app",
  messagingSenderId: "1087776652368",
  appId: "1:1087776652368:web:6168ac2e6c88517d96a555"

});

const messaging =
  firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Background message received:", payload);
});




