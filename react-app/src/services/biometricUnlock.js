import { firebaseApp } from "../firebase.js";

export const BIOMETRIC_UNLOCK_KEY = "bantayBudgetBiometricUnlock";
const DEVICE_ID_KEY = "bantayBudgetDeviceId";

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
  return enabled;
}

export async function enableBiometricUnlock() {
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
  return true;
}

export async function disableBiometricUnlock() {
  await callFunction("removeBiometricUnlock", { deviceId: getDeviceId() });
  localStorage.setItem(BIOMETRIC_UNLOCK_KEY, "false");
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
