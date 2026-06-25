const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

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

        const notificationId = `${recurringDoc.id}_${year}_${month + 1}_${dueDay}`;

        let message = "";

        if (diffDays === 0) {
          message = `${recurring.desc} is due today`;
        } else if (diffDays === 1) {
          message = `${recurring.desc} is due tomorrow`;
        } else {
          message = `${recurring.desc} is due in ${diffDays} days`;
        }

        await db
          .collection("users")
          .doc(uid)
          .collection("notifications")
          .doc(notificationId)
          .set(
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

        logger.info(`Notification created for ${uid}: ${message}`);
      }
    }

    return null;
  }
);