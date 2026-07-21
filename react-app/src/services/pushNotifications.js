import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { db, firebaseApp } from "../firebase.js";

const VAPID_KEY = "BLLmTyyWy1aHNMdOOlA3fIWdCCM_X4-AtHUL909gcNZ8cq7NpmOcRI-cGcG1quoQSpzA5bM4xnahn_1Eipngg7w";
const DEVICE_ID_KEY = "bantayBudgetDeviceId";
export const PUSH_ENABLED_KEY = "pushNotificationsEnabled";

function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export async function enablePushNotifications(uid) {
  if (!("Notification" in window)) throw new Error("Push notifications are not supported by this browser.");
  if (!("serviceWorker" in navigator)) throw new Error("Service workers are not supported by this browser.");
  if (!(await isSupported())) throw new Error("Firebase messaging is not supported by this browser.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not allowed.");

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging(firebaseApp);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) throw new Error("The browser did not provide a notification token.");

  const deviceId = getDeviceId();
  await setDoc(doc(db, "users", uid, "devices", deviceId), {
    token,
    updated: Date.now(),
    device: navigator.userAgent,
  }, { merge: true });
  localStorage.setItem(PUSH_ENABLED_KEY, "true");
}

export async function disablePushNotifications(uid) {
  const deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (deviceId) await deleteDoc(doc(db, "users", uid, "devices", deviceId));

  if (await isSupported()) {
    try {
      await deleteToken(getMessaging(firebaseApp));
    } catch (error) {
      console.warn("Unable to delete the local messaging token:", error);
    }
  }
  localStorage.setItem(PUSH_ENABLED_KEY, "false");
}
