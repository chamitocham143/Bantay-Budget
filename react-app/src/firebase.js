import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDzB2BPPUZLfCNpIEM2JR7VeS8rPwSjzTs",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "expenses-monitoring-4540e.firebaseapp.com",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "expenses-monitoring-4540e",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "expenses-monitoring-4540e.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1087776652368",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:1087776652368:web:6168ac2e6c88517d96a555",
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-E52HTBDCJY",
};

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = initializeFirestore(firebaseApp, {
  experimentalForceLongPolling: true,
});

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Unable to enable persistent authentication:", error);
});

export default firebaseApp;
