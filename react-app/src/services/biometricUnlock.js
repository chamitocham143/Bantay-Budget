import { auth, firebaseApp } from "../firebase.js";
import { signInWithCustomToken } from "firebase/auth";

export const BIOMETRIC_UNLOCK_KEY = "bantayBudgetBiometricUnlock";
const DEVICE_ID_KEY = "bantayBudgetDeviceId";
const BIOMETRIC_LOGIN_UID_KEY = "bantayBudgetBiometricLoginUid";

function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

async function callFunction(name, data = {}) {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const result = await httpsCallable(getFunctions(firebaseApp), name)(data);
  return result.data;
}

export async function biometricUnlockIsAvailable() {
  const {
    browserSupportsWebAuthn,
    platformAuthenticatorIsAvailable,
  } = await import("@simplewebauthn/browser");

  if (!browserSupportsWebAuthn()) return false;

  try {
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}

export async function getBiometricUnlockStatus() {
  const result = await callFunction("getBiometricUnlockStatus", {
    deviceId: getDeviceId(),
  });

  const enabled = Boolean(result.enabled);
  localStorage.setItem(BIOMETRIC_UNLOCK_KEY, String(enabled));
  if (enabled && auth.currentUser?.uid) {
    localStorage.setItem(BIOMETRIC_LOGIN_UID_KEY, auth.currentUser.uid);
  } else if (!enabled) {
    localStorage.removeItem(BIOMETRIC_LOGIN_UID_KEY);
  }
  return enabled;
}

export async function enableBiometricUnlock() {
  if (!auth.currentUser?.uid) {
    throw new Error("Please sign in before enabling Face ID login.");
  }

  const { startRegistration } = await import("@simplewebauthn/browser");
  const options = await callFunction("beginBiometricRegistration", {
    deviceId: getDeviceId(),
  });
  const response = await startRegistration({ optionsJSON: options });
  const result = await callFunction("finishBiometricRegistration", {
    deviceId: getDeviceId(),
    response,
  });

  if (!result.verified) {
    throw new Error("Device authentication could not be verified.");
  }

  localStorage.setItem(BIOMETRIC_UNLOCK_KEY, "true");
  localStorage.setItem(BIOMETRIC_LOGIN_UID_KEY, auth.currentUser.uid);
  return true;
}

export async function disableBiometricUnlock() {
  await callFunction("removeBiometricUnlock", { deviceId: getDeviceId() });
  localStorage.setItem(BIOMETRIC_UNLOCK_KEY, "false");
  localStorage.removeItem(BIOMETRIC_LOGIN_UID_KEY);
}

export function biometricLoginIsEnabledOnDevice() {
  return localStorage.getItem(BIOMETRIC_UNLOCK_KEY) === "true"
    && Boolean(localStorage.getItem(BIOMETRIC_LOGIN_UID_KEY));
}

export async function signInWithBiometric() {
  const uid = localStorage.getItem(BIOMETRIC_LOGIN_UID_KEY);

  if (!biometricLoginIsEnabledOnDevice() || !uid) {
    throw new Error("Face ID login is not enabled on this device.");
  }

  const { startAuthentication } = await import("@simplewebauthn/browser");
  const options = await callFunction("beginBiometricSignIn", {
    uid,
    deviceId: getDeviceId(),
  });
  const response = await startAuthentication({ optionsJSON: options });
  const result = await callFunction("finishBiometricSignIn", {
    uid,
    deviceId: getDeviceId(),
    response,
  });

  if (!result.verified || !result.token) {
    throw new Error("Face ID login could not be verified.");
  }

  return signInWithCustomToken(auth, result.token);
}

export async function verifyBiometricUnlock() {
  const { startAuthentication } = await import("@simplewebauthn/browser");
  const options = await callFunction("beginBiometricAuthentication", {
    deviceId: getDeviceId(),
  });
  const response = await startAuthentication({ optionsJSON: options });
  const result = await callFunction("finishBiometricAuthentication", {
    deviceId: getDeviceId(),
    response,
  });

  if (!result.verified) {
    throw new Error("Device authentication could not be verified.");
  }

  return true;
}
