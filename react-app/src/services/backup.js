import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase.js";
import { getLocalDateString } from "../utils/dates.js";

const COLLECTIONS = ["inflows", "expenses", "recurringExpenses"];

export async function exportBackup(uid) {
  const backup = {
    app: "Bantay Budget",
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    uid,
    data: {},
  };

  for (const collectionName of COLLECTIONS) {
    const snapshot = await getDocs(collection(db, "users", uid, collectionName));
    backup.data[collectionName] = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bantay-budget-backup-${getLocalDateString()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function readBackupFile(file) {
  const backup = JSON.parse(await file.text());
  if (!backup || backup.app !== "Bantay Budget" || !backup.data) {
    throw new Error("This is not a valid Bantay Budget backup file.");
  }
  for (const collectionName of COLLECTIONS) {
    if (backup.data[collectionName] && !Array.isArray(backup.data[collectionName])) {
      throw new Error(`Invalid ${collectionName} backup data.`);
    }
  }
  return backup;
}

async function commitOperations(operations) {
  for (let index = 0; index < operations.length; index += 450) {
    const batch = writeBatch(db);
    operations.slice(index, index + 450).forEach((operation) => {
      if (operation.type === "delete") batch.delete(operation.ref);
      else batch.set(operation.ref, operation.data);
    });
    await batch.commit();
  }
}

export async function restoreBackup(uid, backup) {
  for (const collectionName of COLLECTIONS) {
    const currentSnapshot = await getDocs(collection(db, "users", uid, collectionName));
    const deleteOperations = currentSnapshot.docs.map((item) => ({ type: "delete", ref: item.ref }));
    await commitOperations(deleteOperations);

    const restoreOperations = (backup.data[collectionName] || []).map((item) => {
      const { id, ...data } = item;
      if (!id || typeof id !== "string") throw new Error(`A ${collectionName} record is missing its document ID.`);
      return { type: "set", ref: doc(db, "users", uid, collectionName, id), data };
    });
    await commitOperations(restoreOperations);
  }
}
