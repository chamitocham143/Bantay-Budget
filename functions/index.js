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

    const usersSnapshot = await db.collection("users").get();

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

      for (const recurringDoc of recurringSnapshot.docs) {
        const recurring = recurringDoc.data();

        let dueDay = Number(recurring.recurringDay);
        if (!dueDay) continue;

        const year = today.getFullYear();
        const month = today.getMonth();

        const daysInMonth = new Date(year, month + 1, 0).getDate();

        if (dueDay > daysInMonth) {
          dueDay = daysInMonth;
        }

        const dueDate = new Date(year, month, dueDay);
        dueDate.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil(
          (dueDate - today) / (1000 * 60 * 60 * 24)
        );

        if (diffDays < 0 || diffDays > 3) continue;

const dueDateString =
  dueDate.toISOString().slice(0, 10);

const expenseQuery = await db
  .collection("users")
  .doc(uid)
  .collection("expenses")
  .where("recurringTemplateId", "==", recurringDoc.id)
  .where("date", "==", dueDateString)
  .limit(1)
  .get();

if (expenseQuery.empty) {
  logger.info(
    `Skipping notification for ${uid}: no expense found for ${recurring.desc} on ${dueDateString}`
  );
  continue;
}

const expense = expenseQuery.docs[0].data();

logger.info(
  `Expense found: ${recurring.desc}, status=${expense.status}, due=${dueDateString}, diffDays=${diffDays}`
);

if (expense.status !== "PENDING") {
  logger.info(
    `Skipping notification for ${uid}: ${recurring.desc} is ${expense.status}`
  );
  continue;
}
        const notificationId =
          `${recurringDoc.id}_${year}_${month + 1}_${dueDay}`;

        let message = "";

        if (diffDays === 0) {
          message = `${recurring.desc} is due today`;
        } else if (diffDays === 1) {
          message = `${recurring.desc} is due tomorrow`;
        } else {
          message = `${recurring.desc} is due in ${diffDays} days`;
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
    `Notification already exists for ${uid}: ${notificationId}`
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
              dueDate: dueDate.toISOString().slice(0, 10),
              read: false,
              created: Date.now(),
            },
            { merge: true }
          );

       await sendPushToUserDevices(
  uid,
  recurring.desc,
  `${message} • $${Number(recurring.amount).toFixed(2)}`
);
        logger.info(`Notification created for ${uid}: ${message}`);
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