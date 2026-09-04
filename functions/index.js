const {
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");

const {
  onSchedule,
} = require("firebase-functions/v2/scheduler");

const {
  logger,
} = require("firebase-functions");
const {
  defineSecret,
} = require("firebase-functions/params");

const admin = require("firebase-admin");
const {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} = require("@simplewebauthn/server");

admin.initializeApp();

const db = admin.firestore();
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const EMAIL_FROM = "Bantay Budget <reminders@bantaybudget.fyi>";

const WEBAUTHN_RP_NAME = "Bantay Budget";
const WEBAUTHN_CHALLENGE_TTL = 5 * 60 * 1000;
const WEBAUTHN_ALLOWED_ORIGINS = new Set([
  "https://bantaybudget.fyi",
  "https://www.bantaybudget.fyi",
  "https://expenses-monitoring-4540e.web.app",
  "https://expenses-monitoring-4540e.firebaseapp.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function requireAuthenticatedUser(request) {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError("unauthenticated", "Please log in first.");
  }

  return uid;
}

function requireDeviceId(request) {
  const deviceId = String(request.data?.deviceId || "");

  if (!/^[a-zA-Z0-9-]{20,80}$/.test(deviceId)) {
    throw new HttpsError("invalid-argument", "A valid device identifier is required.");
  }

  return deviceId;
}

function requireBiometricLoginUid(request) {
  const uid = String(request.data?.uid || "");

  if (!uid || uid.length > 128 || uid.includes("/")) {
    throw new HttpsError("invalid-argument", "Face ID login is not available on this device.");
  }

  return uid;
}

function getWebAuthnContext(request) {
  const origin = request.rawRequest?.get("origin") || "";
  const previewOrigin = /^https:\/\/expenses-monitoring-4540e--[a-z0-9-]+\.web\.app$/;

  if (!WEBAUTHN_ALLOWED_ORIGINS.has(origin) && !previewOrigin.test(origin)) {
    throw new HttpsError("permission-denied", "Biometric unlock is not available from this site.");
  }

  const hostname = new URL(origin).hostname;
  const rpID = hostname === "www.bantaybudget.fyi" ? "bantaybudget.fyi" : hostname;

  return { origin, rpID };
}

function challengeRef(uid, ceremony) {
  return db
    .collection("users")
    .doc(uid)
    .collection("webauthnChallenges")
    .doc(ceremony);
}

function credentialsRef(uid) {
  return db
    .collection("users")
    .doc(uid)
    .collection("webauthnCredentials");
}

async function saveChallenge(uid, ceremony, challenge, deviceId, context) {
  await challengeRef(uid, ceremony).set({
    challenge,
    deviceId,
    origin: context.origin,
    rpID: context.rpID,
    expiresAt: Date.now() + WEBAUTHN_CHALLENGE_TTL,
  });
}

async function consumeChallenge(uid, ceremony, deviceId, context) {
  const ref = challengeRef(uid, ceremony);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    transaction.delete(ref);

    if (!snapshot.exists) {
      throw new HttpsError("failed-precondition", "The authentication request expired. Please try again.");
    }

    const data = snapshot.data();
    const valid = data.expiresAt > Date.now()
      && data.deviceId === deviceId
      && data.origin === context.origin
      && data.rpID === context.rpID;

    if (!valid) {
      throw new HttpsError("failed-precondition", "The authentication request is no longer valid. Please try again.");
    }

    return data.challenge;
  });
}

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

/* =========================================================
   DATE HELPERS
========================================================= */

function buildDueDetails(
  year,
  monthIndex,
  requestedDueDay
) {
  const daysInMonth = new Date(
    year,
    monthIndex + 1,
    0
  ).getDate();

  const dueDay = Math.min(
    requestedDueDay,
    daysInMonth
  );

  const dueDate = new Date(
    year,
    monthIndex,
    dueDay
  );

  dueDate.setHours(0, 0, 0, 0);

  const month = String(
    monthIndex + 1
  ).padStart(2, "0");

  const dueDateString =
    `${year}-${month}-${String(dueDay).padStart(
      2,
      "0"
    )}`;

  return {
    year,
    monthIndex,
    month,
    dueDay,
    dueDate,
    dueDateString,
  };
}

function getUpcomingDueDetails(
  today,
  requestedDueDay
) {
  let targetYear = today.getFullYear();
  let targetMonthIndex = today.getMonth();

  let dueDetails = buildDueDetails(
    targetYear,
    targetMonthIndex,
    requestedDueDay
  );

  /*
   * If this month's due date already passed,
   * evaluate the same recurring expense for
   * next month.
   *
   * Example:
   * July 31 + recurring day 1 = August 1.
   */
  if (dueDetails.dueDate < today) {
    const nextMonth = new Date(
      targetYear,
      targetMonthIndex + 1,
      1
    );

    targetYear = nextMonth.getFullYear();
    targetMonthIndex = nextMonth.getMonth();

    dueDetails = buildDueDetails(
      targetYear,
      targetMonthIndex,
      requestedDueDay
    );
  }

  return dueDetails;
}

/* =========================================================
   PUSH NOTIFICATIONS
========================================================= */

async function sendPushToUserDevices(
  uid,
  title,
  body,
  data = {}
) {

  const devicesSnapshot = await db
    .collection("users")
    .doc(uid)
    .collection("devices")
    .get();

  if (devicesSnapshot.empty) {
    logger.info(
      `No FCM devices found for ${uid}`
    );

    return 0;
  }

  const messages = [];

  devicesSnapshot.forEach((deviceDoc) => {
    const device = deviceDoc.data();

    if (!device.token) {
      return;
    }

   messages.push({
  token: device.token,

  notification: {
    title,
    body,
  },

  data,

  webpush: {
    notification: {
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    },
  },
});
  });

  if (messages.length === 0) {
    logger.info(
      `No valid FCM tokens found for ${uid}`
    );

    return 0;
  }

  const response =
    await admin.messaging().sendEach(messages);

  logger.info(
    `Push sent to ${response.successCount}/` +
    `${messages.length} device(s) for ${uid}`
  );

  return response.successCount;
}

function escapeEmailHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatEmailDueDate(dueDate) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${dueDate}T12:00:00Z`));
}

function normalizeEmailDescription(value) {
  return String(value || "Recurring payment")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "Recurring payment";
}

async function emailRemindersAreEnabled(uid) {
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("settings")
    .doc("emailReminders")
    .get();

  return snapshot.exists && snapshot.data().enabled === true;
}

async function sendResendEmail(uid, { subject, text, html, idempotencyKey }) {
  const userRecord = await admin.auth().getUser(uid);

  if (!userRecord.email || !userRecord.emailVerified || userRecord.disabled) {
    throw new Error("The Firebase account does not have an eligible verified email address.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY.value()}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [userRecord.email],
      subject,
      text,
      html,
    }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Resend rejected the reminder (${response.status}): ${result.message || "Unknown error"}`);
  }

  return result;
}

async function sendDueEmailOnce(uid, recurringId, recurring, dueDetails) {
  if (!(await emailRemindersAreEnabled(uid))) return false;

  const reminderId = `${recurringId}_${dueDetails.dueDateString}`;
  const deliveryRef = db
    .collection("users")
    .doc(uid)
    .collection("emailReminders")
    .doc(reminderId);
  const existingDelivery = await deliveryRef.get();

  if (existingDelivery.exists && existingDelivery.data().sentAt) return false;

  const description = normalizeEmailDescription(recurring.desc);
  const safeDescription = escapeEmailHtml(description);
  const formattedDueDate = formatEmailDueDate(dueDetails.dueDateString);
  const result = await sendResendEmail(uid, {
    subject: `${description} is due in 3 days`,
    text: `${description} is due on ${formattedDueDate}. Open Bantay Budget to review the amount and status: https://bantaybudget.fyi`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#12352f"><h1 style="color:#005346">Payment reminder</h1><p><strong>${safeDescription}</strong> is due in 3 days.</p><p>Due date: <strong>${escapeEmailHtml(formattedDueDate)}</strong></p><p><a href="https://bantaybudget.fyi" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#005346;color:#fff;text-decoration:none;font-weight:700">Open Bantay Budget</a></p><p style="margin-top:24px;color:#64748b;font-size:12px">You received this because Email Reminders are enabled in Bantay Budget Settings.</p></div>`,
    idempotencyKey: `due-${uid}-${reminderId}`,
  });

  await deliveryRef.set({
    type: "RECURRING_DUE_EMAIL",
    recurringTemplateId: recurringId,
    dueDate: dueDetails.dueDateString,
    providerMessageId: result.id || null,
    sentAt: Date.now(),
  });

  return true;
}

async function sendDueEmailSafely(uid, recurringId, recurring, dueDetails, reminderId) {
  try {
    const emailSent = await sendDueEmailOnce(
      uid,
      recurringId,
      recurring,
      dueDetails,
    );

    if (emailSent) {
      logger.info(`Due reminder email sent for ${uid}: ${reminderId}`);
    }
  } catch (emailError) {
    logger.error("Unable to send due reminder email", {
      uid,
      reminderId,
      error: emailError.message,
    });
  }
}

/* =========================================================
   NOTIFICATION CLEANUP
========================================================= */

async function cleanupOldNotifications(uid) {
  const thirtyDaysAgo =
    Date.now() -
    30 * MILLISECONDS_PER_DAY;

  const oldNotifications = await db
    .collection("users")
    .doc(uid)
    .collection("notifications")
    .where("read", "==", true)
    .where("created", "<", thirtyDaysAgo)
    .get();

  if (oldNotifications.empty) {
    return;
  }

  const batch = db.batch();

  oldNotifications.docs.forEach(
    (notificationDocument) => {
      batch.delete(notificationDocument.ref);
    }
  );

  await batch.commit();

  logger.info(
    `Deleted ${oldNotifications.size} ` +
    `old notification(s) for ${uid}`
  );
}

/* =========================================================
   DAILY RECURRING REMINDER
========================================================= */

exports.dailyReminder = onSchedule(
  {
    schedule: "every day 08:00",
    timeZone: "America/Los_Angeles",
    secrets: [RESEND_API_KEY],
  },

  async () => {
    logger.info(
      "Daily reminder function executed!"
    );

    const usersSnapshot = await db
      .collection("users")
      .get();

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;

      await cleanupOldNotifications(uid);

      const recurringSnapshot = await db
        .collection("users")
        .doc(uid)
        .collection("recurringExpenses")
        .where("active", "==", true)
        .get();

      logger.info(
        `Checking ${recurringSnapshot.size} ` +
        `active recurring template(s) for ${uid}`
      );

      for (
        const recurringDoc of recurringSnapshot.docs
      ) {
        const recurring = recurringDoc.data();

        const requestedDueDay = Number(
          recurring.recurringDay
        );

        if (
          !Number.isInteger(requestedDueDay) ||
          requestedDueDay < 1 ||
          requestedDueDay > 31
        ) {
          logger.warn(
            `Invalid recurring day for ` +
            `${recurringDoc.id}: ` +
            `${recurring.recurringDay}`
          );

          continue;
        }

        const dueDetails =
          getUpcomingDueDetails(
            today,
            requestedDueDay
          );

        const diffDays = Math.round(
          (
            dueDetails.dueDate.getTime() -
            today.getTime()
          ) / MILLISECONDS_PER_DAY
        );

        logger.info(
          `Checking ${recurring.desc} for ${uid}: ` +
          `due ${dueDetails.dueDateString}, ` +
          `${diffDays} day(s) away`
        );

        /*
         * Only process expenses due today or
         * during the next three days.
         */
        if (diffDays < 0 || diffDays > 3) {
          continue;
        }

        /*
         * Matches the client-generated ID:
         *
         * templateId_2026_08
         */
        const expenseId =
          `${recurringDoc.id}_` +
          `${dueDetails.year}_` +
          `${dueDetails.month}`;

        /*
         * Keep the existing notification ID format
         * so previously created notifications remain
         * duplicate-safe.
         */
        const notificationId =
          `${recurringDoc.id}_` +
          `${dueDetails.year}_` +
          `${dueDetails.monthIndex + 1}_` +
          `${dueDetails.dueDay}`;

        const expenseRef = db
          .collection("users")
          .doc(uid)
          .collection("expenses")
          .doc(expenseId);

        const expenseSnapshot =
          await expenseRef.get();

        if (!expenseSnapshot.exists) {
          /*
           * Email delivery is based on the active template,
           * so it still works when the user has not opened the
           * app recently enough to generate this month's record.
           */
          if (diffDays === 3) {
            await sendDueEmailSafely(
              uid,
              recurringDoc.id,
              recurring,
              dueDetails,
              notificationId,
            );
          }

          logger.info(
            `Skipping ${uid}: generated expense ` +
            `${expenseId} was not found`
          );

          continue;
        }

        const expense = expenseSnapshot.data();

        if (
          !expense.recurring ||
          expense.recurringTemplateId !==
            recurringDoc.id
        ) {
          logger.warn(
            `Skipping ${uid}: ${expenseId} is not ` +
            "the expected recurring expense"
          );

          continue;
        }

        if (
          expense.dueDate &&
          expense.dueDate !==
            dueDetails.dueDateString
        ) {
          logger.warn(
            `Skipping ${uid}: ${expenseId} has ` +
            `due date ${expense.dueDate}, expected ` +
            dueDetails.dueDateString
          );

          continue;
        }

        let expenseStatus = expense.status;

        /*
         * Automatically activate the generated
         * expense three days before it is due.
         */
        if (expenseStatus === "ON HOLD") {
          await expenseRef.update({
            status: "PENDING",
            statusUpdatedAt: Date.now(),
            statusUpdatedBy: "dailyReminder",
          });

          expenseStatus = "PENDING";

          logger.info(
            `Changed ${expenseId} from ON HOLD ` +
            `to PENDING for ${uid}`
          );
        }

        /*
         * A paid expense must never be changed or
         * receive another due reminder.
         */
        if (expenseStatus === "PAID") {
          logger.info(
            `Skipping notification for ${uid}: ` +
            `${recurring.desc} is PAID`
          );

          continue;
        }

        if (expenseStatus !== "PENDING") {
          logger.info(
            `Skipping notification for ${uid}: ` +
            `${recurring.desc} is ${expenseStatus}`
          );

          continue;
        }

        let message = "";

        if (diffDays === 0) {
          message = "Payment due today";
        } else if (diffDays === 1) {
          message = "Payment due tomorrow";
        } else {
          message =
            `Payment due in ${diffDays} days`;
        }

        if (diffDays === 3) {
          await sendDueEmailSafely(
            uid,
            recurringDoc.id,
            recurring,
            dueDetails,
            notificationId,
          );
        }

        const notificationRef = db
          .collection("users")
          .doc(uid)
          .collection("notifications")
          .doc(notificationId);

        const existingNotification =
          await notificationRef.get();

        if (existingNotification.exists) {
          logger.info(
            `Notification already exists for ` +
            `${uid}: ${notificationId}`
          );

          continue;
        }

        await notificationRef.set(
          {
            type: "RECURRING_DUE",
            title: "Upcoming recurring due",
            message,
            desc: recurring.desc,
            amount: Number(recurring.amount),
            recurringDay: dueDetails.dueDay,
            dueDate: dueDetails.dueDateString,
            read: false,
            created: Date.now(),
          },

          {
            merge: true,
          }
        );

        const unreadNotificationsSnapshot = await db
        .collection("users")
        .doc(uid)
        .collection("notifications")
        .where("read", "==", false)
        .get();

        const unreadCount =
        unreadNotificationsSnapshot.size;

        await sendPushToUserDevices(
          uid,
          "Reminder 🔔",
          `${recurring.desc} • ${message} • ` +
            `$${Number(recurring.amount).toFixed(2)}`,
          {
            unreadCount: String(unreadCount),
          }
        );

        logger.info(
          `Notification created for ${uid}: ` +
          `${recurring.desc} • ${message}`
        );
      }
    }

    return null;
  }
);

/* =========================================================
   TEST PUSH
========================================================= */

exports.sendTestPush = onCall(
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError(
        "unauthenticated",
        "Please log in first."
      );
    }

    const sentCount =
      await sendPushToUserDevices(
        uid,
        "Due Reminder",
        "Netflix is due tomorrow • $15.99"
      );

    if (sentCount === 0) {
      throw new HttpsError(
        "not-found",
        "No valid FCM devices found."
      );
    }

    return {
      success: true,
      sentCount,
      message:
        `Test push sent to ${sentCount} ` +
        "device(s)!",
    };
  }
);

exports.sendTestEmailReminder = onCall(
  { secrets: [RESEND_API_KEY] },
  async (request) => {
    const uid = requireAuthenticatedUser(request);

    if (!(await emailRemindersAreEnabled(uid))) {
      throw new HttpsError("failed-precondition", "Enable Email Reminders in Settings first.");
    }

    try {
      const result = await sendResendEmail(uid, {
        subject: "Bantay Budget email reminders are ready",
        text: "This is a test reminder from Bantay Budget. Your email reminders are configured correctly.",
        html: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#12352f"><h1 style="color:#005346">Email reminders are ready</h1><p>This is a test reminder from Bantay Budget.</p><p>Your verified account email can now receive recurring-payment reminders three days before they are due.</p></div>',
        idempotencyKey: `test-${uid}-${Date.now()}`,
      });

      return { success: true, messageId: result.id || null };
    } catch (error) {
      logger.error("Unable to send test email reminder", { uid, error: error.message });
      throw new HttpsError("internal", "Unable to send the test email reminder.");
    }
  },
);

/* =========================================================
   BIOMETRIC / PASSKEY APP UNLOCK
========================================================= */

exports.getBiometricUnlockStatus = onCall(async (request) => {
  const uid = requireAuthenticatedUser(request);
  const deviceId = requireDeviceId(request);
  const context = getWebAuthnContext(request);
  const snapshot = await credentialsRef(uid)
    .where("deviceId", "==", deviceId)
    .get();

  return {
    enabled: snapshot.docs.some(
      (document) => document.data().rpID === context.rpID,
    ),
  };
});

exports.beginBiometricRegistration = onCall(async (request) => {
  const uid = requireAuthenticatedUser(request);
  const deviceId = requireDeviceId(request);
  const context = getWebAuthnContext(request);
  const existing = await credentialsRef(uid)
    .where("rpID", "==", context.rpID)
    .get();

  const options = await generateRegistrationOptions({
    rpName: WEBAUTHN_RP_NAME,
    rpID: context.rpID,
    userID: Buffer.from(uid, "utf8"),
    userName: request.auth.token.email || uid,
    userDisplayName: request.auth.token.name || request.auth.token.email || "Bantay Budget user",
    attestationType: "none",
    timeout: 60_000,
    excludeCredentials: existing.docs.map((document) => {
      const credential = document.data();
      return {
        id: credential.id,
        transports: credential.transports || undefined,
      };
    }),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "preferred",
      userVerification: "required",
    },
    preferredAuthenticatorType: "localDevice",
  });

  await saveChallenge(uid, "registration", options.challenge, deviceId, context);
  return options;
});

exports.finishBiometricRegistration = onCall(async (request) => {
  const uid = requireAuthenticatedUser(request);
  const deviceId = requireDeviceId(request);
  const context = getWebAuthnContext(request);
  const response = request.data?.response;

  if (!response || typeof response !== "object") {
    throw new HttpsError("invalid-argument", "A registration response is required.");
  }

  const expectedChallenge = await consumeChallenge(
    uid,
    "registration",
    deviceId,
    context,
  );

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: context.origin,
      expectedRPID: context.rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Registration was not verified.");
    }

    const info = verification.registrationInfo;
    const credential = info.credential;

    await credentialsRef(uid).doc(credential.id).set({
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: response.response?.transports || credential.transports || [],
      deviceId,
      rpID: context.rpID,
      origin: context.origin,
      credentialDeviceType: info.credentialDeviceType,
      credentialBackedUp: info.credentialBackedUp,
      createdAt: Date.now(),
      lastUsedAt: null,
    });

    return { verified: true };
  } catch (error) {
    logger.warn("Biometric registration verification failed", { uid, error: error.message });
    throw new HttpsError("permission-denied", "Device authentication could not be verified.");
  }
});

exports.beginBiometricAuthentication = onCall(async (request) => {
  const uid = requireAuthenticatedUser(request);
  const deviceId = requireDeviceId(request);
  const context = getWebAuthnContext(request);
  const registered = await credentialsRef(uid)
    .where("deviceId", "==", deviceId)
    .get();
  const credentials = registered.docs
    .map((document) => document.data())
    .filter((credential) => credential.rpID === context.rpID);

  if (credentials.length === 0) {
    throw new HttpsError("not-found", "Face ID / device unlock is not registered on this device.");
  }

  const options = await generateAuthenticationOptions({
    rpID: context.rpID,
    timeout: 60_000,
    userVerification: "required",
    allowCredentials: credentials.map((credential) => ({
      id: credential.id,
      transports: credential.transports || undefined,
    })),
  });

  await saveChallenge(uid, "authentication", options.challenge, deviceId, context);
  return options;
});

exports.finishBiometricAuthentication = onCall(async (request) => {
  const uid = requireAuthenticatedUser(request);
  const deviceId = requireDeviceId(request);
  const context = getWebAuthnContext(request);
  const response = request.data?.response;

  if (!response?.id) {
    throw new HttpsError("invalid-argument", "An authentication response is required.");
  }

  const expectedChallenge = await consumeChallenge(
    uid,
    "authentication",
    deviceId,
    context,
  );
  const credentialRef = credentialsRef(uid).doc(response.id);
  const snapshot = await credentialRef.get();

  if (!snapshot.exists) {
    throw new HttpsError("not-found", "The registered device credential was not found.");
  }

  const stored = snapshot.data();

  if (stored.deviceId !== deviceId || stored.rpID !== context.rpID) {
    throw new HttpsError("permission-denied", "This credential is not registered for this device.");
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: context.origin,
      expectedRPID: context.rpID,
      requireUserVerification: true,
      credential: {
        id: stored.id,
        publicKey: Buffer.from(stored.publicKey, "base64url"),
        counter: Number(stored.counter || 0),
        transports: stored.transports || undefined,
      },
    });

    if (!verification.verified || !verification.authenticationInfo.userVerified) {
      throw new Error("Authentication was not verified.");
    }

    await credentialRef.update({
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: Date.now(),
      credentialBackedUp: verification.authenticationInfo.credentialBackedUp,
    });

    return { verified: true };
  } catch (error) {
    logger.warn("Biometric authentication verification failed", { uid, error: error.message });
    throw new HttpsError("permission-denied", "Device authentication could not be verified.");
  }
});

exports.beginBiometricSignIn = onCall(async (request) => {
  const uid = requireBiometricLoginUid(request);
  const deviceId = requireDeviceId(request);
  const context = getWebAuthnContext(request);
  const registered = await credentialsRef(uid)
    .where("deviceId", "==", deviceId)
    .get();
  const credentials = registered.docs
    .map((document) => document.data())
    .filter((credential) => credential.rpID === context.rpID);

  if (credentials.length === 0) {
    throw new HttpsError("not-found", "Face ID login is not available on this device.");
  }

  const options = await generateAuthenticationOptions({
    rpID: context.rpID,
    timeout: 60_000,
    userVerification: "required",
    allowCredentials: credentials.map((credential) => ({
      id: credential.id,
      transports: credential.transports || undefined,
    })),
  });

  await saveChallenge(uid, "signIn", options.challenge, deviceId, context);
  return options;
});

exports.finishBiometricSignIn = onCall(async (request) => {
  const uid = requireBiometricLoginUid(request);
  const deviceId = requireDeviceId(request);
  const context = getWebAuthnContext(request);
  const response = request.data?.response;

  if (!response?.id || !/^[a-zA-Z0-9_-]{20,1024}$/.test(response.id)) {
    throw new HttpsError("invalid-argument", "A Face ID response is required.");
  }

  const expectedChallenge = await consumeChallenge(
    uid,
    "signIn",
    deviceId,
    context,
  );
  try {
    const credentialRef = credentialsRef(uid).doc(response.id);
    const [credentialSnapshot, userRecord] = await Promise.all([
      credentialRef.get(),
      admin.auth().getUser(uid),
    ]);

    if (!credentialSnapshot.exists || !userRecord.emailVerified || userRecord.disabled) {
      throw new Error("The account or passkey is not eligible for sign-in.");
    }

    const stored = credentialSnapshot.data();
    if (stored.deviceId !== deviceId || stored.rpID !== context.rpID) {
      throw new Error("The passkey is not registered for this device.");
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: context.origin,
      expectedRPID: context.rpID,
      requireUserVerification: true,
      credential: {
        id: stored.id,
        publicKey: Buffer.from(stored.publicKey, "base64url"),
        counter: Number(stored.counter || 0),
        transports: stored.transports || undefined,
      },
    });

    if (!verification.verified || !verification.authenticationInfo.userVerified) {
      throw new Error("Authentication was not verified.");
    }

    await credentialRef.update({
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: Date.now(),
      credentialBackedUp: verification.authenticationInfo.credentialBackedUp,
    });

    const token = await admin.auth().createCustomToken(uid);
    return { verified: true, token };
  } catch (error) {
    logger.warn("Biometric sign-in verification failed", { uid, error: error.message });
    throw new HttpsError("permission-denied", "Face ID login could not be verified.");
  }
});

exports.removeBiometricUnlock = onCall(async (request) => {
  const uid = requireAuthenticatedUser(request);
  const deviceId = requireDeviceId(request);
  const snapshot = await credentialsRef(uid)
    .where("deviceId", "==", deviceId)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((document) => batch.delete(document.ref));
  batch.delete(challengeRef(uid, "registration"));
  batch.delete(challengeRef(uid, "authentication"));
  batch.delete(challengeRef(uid, "signIn"));
  await batch.commit();

  return { removed: snapshot.size };
});
