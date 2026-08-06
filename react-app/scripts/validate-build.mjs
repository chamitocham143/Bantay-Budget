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

const recurringSource = await readFile(
  resolve("src/hooks/useRecurringExpenses.js"),
  "utf8"
);

const recurringInvariants = [
  "getGenerationCandidate",
  "generationDate.getDate() - 7",
  "`${template.id}_${candidate.year}_${candidate.month}`",
  "dueDate: candidate.dueDate",
  'status: "ON HOLD"',
  "existingExpense.exists()",
];

if (
  !recurringInvariants.every((invariant) =>
    recurringSource.includes(invariant)
  )
) {
  throw new Error(
  "Seven-day recurring generation invariants are missing."
);
}

const lockSource = await readFile(resolve("src/hooks/useInactivityLock.js"), "utf8");
if (!lockSource.includes("3 * 60 * 1000") || lockSource.includes("visibilitychange") || lockSource.includes("blur")) {
  throw new Error("Inactivity-only app-lock validation failed.");
}

const budgetSource = await readFile(resolve("src/hooks/useBudgetData.js"), "utf8");
if (!budgetSource.includes("inflowTotal - expenseTotals.paidTotal") || !budgetSource.includes("allocable - expenseTotals.pendingTotal")) {
  throw new Error("Financial calculation invariants are missing.");
}

const csvSource = await readFile(resolve("src/services/csvExport.js"), "utf8");
if (!csvSource.includes("Budget Summary for ${month}.csv") || !csvSource.includes("replaceAll")) {
  throw new Error("CSV export validation failed.");
}

const paritySources = await Promise.all([
  readFile(resolve("src/components/FinanceTip.jsx"), "utf8"),
  readFile(resolve("src/hooks/usePullToRefresh.js"), "utf8"),
  readFile(resolve("src/services/developerTools.js"), "utf8"),
  readFile(resolve("src/components/AuthScreen.jsx"), "utf8"),
]);
if (!paritySources[0].includes("financeTipDate") || !paritySources[1].includes("touchmove") || !paritySources[2].includes("sendTestPush") || !paritySources[3].includes("showRegisterPassword")) {
  throw new Error("Legacy convenience-feature parity validation failed.");
}
console.log("React production build and PWA assets validated.");
