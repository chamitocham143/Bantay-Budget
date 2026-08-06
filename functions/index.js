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

admin.initializeApp();

const db = admin.firestore();

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