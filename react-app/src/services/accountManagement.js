import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { auth, firebaseApp } from "../firebase.js";

async function reauthenticateWithPassword(password) {
  const user = auth.currentUser;

  if (!user?.email) {
    throw new Error("Please sign in again before managing your account.");
  }

  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  await user.getIdToken(true);
  return user;
}

export async function requestEmailChange(newEmail, password) {
  const user = await reauthenticateWithPassword(password);
  await verifyBeforeUpdateEmail(user, newEmail);
}

export async function deleteUserAccount(password) {
  await reauthenticateWithPassword(password);
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  await httpsCallable(getFunctions(firebaseApp), "deleteAccount")();
  await signOut(auth).catch(() => undefined);
}

