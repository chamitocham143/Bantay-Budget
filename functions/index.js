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

const admin = require("firebase-admin");
const {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} = require("@simplewebauthn/server");

admin.initializeApp();

const db = admin.firestore();

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

        const expenseRef = db
          .collection("users")
          .doc(uid)
          .collection("expenses")
          .doc(expenseId);

        const expenseSnapshot =
          await expenseRef.get();

        if (!expenseSnapshot.exists) {
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
  await batch.commit();

  return { removed: snapshot.size };
});
