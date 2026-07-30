const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

async function sendPushToUserDevices(uid, title, body) {
  const devicesSnapshot = await db
    .collection("users")
    .doc(uid)
    .collection("devices")
    .get();

  if (devicesSnapshot.empty) {
    logger.info(`No FCM devices found for ${uid}`);
    return 0;
  }

  const messages = [];

  devicesSnapshot.forEach(deviceDoc => {
    const device = deviceDoc.data();

    if (device.token) {
      messages.push({
        token: device.token,
        notification: {
          title,
          body
        },
        webpush: {
          notification: {
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png"
          }
        }
      });
    }
  });

  if (messages.length === 0) {
    logger.info(`No valid FCM tokens found for ${uid}`);
    return 0;
  }

  const response = await admin.messaging().sendEach(messages);

  logger.info(
    `Push sent to ${response.successCount}/${messages.length} device(s) for ${uid}`
  );

  return response.successCount;
}

async function cleanupOldNotifications(uid) {
  const thirtyDaysAgo =
    Date.now() - 30 * 24 * 60 * 60 * 1000;

  const oldNotifications = await db
    .collection("users")
    .doc(uid)
    .collection("notifications")
    .where("read", "==", true)
    .where("created", "<", thirtyDaysAgo)
    .get();

  if (oldNotifications.empty) return;

  const batch = db.batch();

  oldNotifications.docs.forEach(docSnap => {
    batch.delete(docSnap.ref);
  });

  await batch.commit();

  logger.info(
    `Deleted ${oldNotifications.size} old notification(s) for ${uid}`
  );
}

exports.dailyReminder = onSchedule(
  {
    schedule: "every day 08:00",
    timeZone: "America/Los_Angeles",
  },
  async () => {
    logger.info("Daily reminder function executed!");

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

      for (
        const recurringDoc of recurringSnapshot.docs
      ) {
        const recurring = recurringDoc.data();

        let dueDay = Number(
          recurring.recurringDay
        );

        if (!dueDay) {
          continue;
        }

        const year = today.getFullYear();
        const monthIndex = today.getMonth();

        const month = String(
          monthIndex + 1
        ).padStart(2, "0");

        const daysInMonth = new Date(
          year,
          monthIndex + 1,
          0
        ).getDate();

        dueDay = Math.min(
          dueDay,
          daysInMonth
        );

        const dueDate = new Date(
          year,
          monthIndex,
          dueDay
        );

        dueDate.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil(
          (dueDate.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        // Only process the three-day reminder window.
        if (diffDays < 0 || diffDays > 3) {
          continue;
        }

        const dueDateString =
          `${year}-${month}-${String(
            dueDay
          ).padStart(2, "0")}`;

        /*
         * This matches the duplicate-safe ID created
         * by useRecurringExpenses:
         *
         * templateId_2026_08
         */
        const expenseId =
          `${recurringDoc.id}_${year}_${month}`;

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

        let expenseStatus = expense.status;

        /*
         * Automatically activate the expense when its
         * due date enters the three-day window.
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

        // Never notify an expense already paid.
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

        let dueText = "";

        if (diffDays === 0) {
          dueText = "Payment due today";
        } else if (diffDays === 1) {
          dueText = "Payment due tomorrow";
        } else {
          dueText =
            `Payment due in ${diffDays} days`;
        }

        const message = dueText;

        // Keep the existing notification ID format
        // so previously created reminders do not duplicate.
        const notificationId =
          `${recurringDoc.id}_${year}_` +
          `${monthIndex + 1}_${dueDay}`;

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
            recurringDay: dueDay,
            dueDate: dueDateString,
            read: false,
            created: Date.now(),
          },
          {
            merge: true,
          }
        );

        await sendPushToUserDevices(
          uid,
          "Reminder 🔔",
          `${recurring.desc} • ${message} • ` +
            `$${Number(recurring.amount).toFixed(2)}`
        );

        logger.info(
          `Notification created for ${uid}: ` +
          message
        );
      }
    }

    return null;
  }
);

exports.sendTestPush = onCall(async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError("unauthenticated", "Please log in first.");
  }

  const sentCount = await sendPushToUserDevices(
    uid,
    "Due Reminder",
    "Netflix is due tomorrow • $15.99"
  );

  if (sentCount === 0) {
    throw new HttpsError("not-found", "No valid FCM devices found.");
  }

  return {
    success: true,
    sentCount,
    message: `Test push sent to ${sentCount} device(s)!`
  };
});