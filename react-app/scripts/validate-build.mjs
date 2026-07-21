import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const requiredFiles = [
  "dist/index.html",
  "dist/manifest.webmanifest",
  "dist/firebase-messaging-sw.js",
  "dist/icons/icon-192.png",
  "dist/icons/icon-512.png",
  "dist/icons/maskable-512.png",
];

await Promise.all(requiredFiles.map((file) => access(resolve(file))));
const manifest = JSON.parse(await readFile(resolve("dist/manifest.webmanifest"), "utf8"));
if (manifest.name !== "Bantay Budget" || manifest.display !== "standalone") {
  throw new Error("PWA manifest validation failed.");
}
if (!Array.isArray(manifest.icons) || manifest.icons.length < 3) {
  throw new Error("PWA icon validation failed.");
}
const serviceWorker = await readFile(resolve("dist/firebase-messaging-sw.js"), "utf8");
if (!serviceWorker.includes("onBackgroundMessage") || !serviceWorker.includes("self.addEventListener(\"fetch\"")) {
  throw new Error("Combined messaging/offline service worker validation failed.");
}

const recurringSource = await readFile(resolve("src/hooks/useRecurringExpenses.js"), "utf8");
if (!recurringSource.includes("${template.id}_${year}_${month}") || !recurringSource.includes('status: "ON HOLD"')) {
  throw new Error("Recurring generation invariants are missing.");
}

const lockSource = await readFile(resolve("src/hooks/useInactivityLock.js"), "utf8");
if (!lockSource.includes("3 * 60 * 1000") || lockSource.includes("visibilitychange") || lockSource.includes("blur")) {
  throw new Error("Inactivity-only app-lock validation failed.");
}

const budgetSource = await readFile(resolve("src/hooks/useBudgetData.js"), "utf8");
if (!budgetSource.includes("inflowTotal - expenseTotals.paidTotal") || !budgetSource.includes("allocable - expenseTotals.pendingTotal")) {
  throw new Error("Financial calculation invariants are missing.");
}
console.log("React production build and PWA assets validated.");
