import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, firebaseApp } from "../firebase.js";

function emailReminderRef(uid) {
  return doc(db, "users", uid, "settings", "emailReminders");
}

export async function getEmailReminderStatus(uid) {
  const snapshot = await getDoc(emailReminderRef(uid));
  return snapshot.exists() && snapshot.data().enabled === true;
}

export async function setEmailReminderStatus(uid, enabled) {
  await setDoc(emailReminderRef(uid), {
    enabled: Boolean(enabled),
    updatedAt: Date.now(),
  }, { merge: true });

  return Boolean(enabled);
}

export async function sendTestEmailReminder() {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const result = await httpsCallable(
    getFunctions(firebaseApp),
    "sendTestEmailReminder",
  )();

  return result.data;
}
