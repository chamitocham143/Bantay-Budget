import { firebaseApp } from "../firebase.js";

export async function sendTestPush() {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const result = await httpsCallable(getFunctions(firebaseApp), "sendTestPush")();
  return result.data;
}
