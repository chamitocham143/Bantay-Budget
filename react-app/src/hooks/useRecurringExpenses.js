import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase.js";
import { getLocalDateString } from "../utils/dates.js";

function getGenerationCandidate(
  year,
  monthIndex,
  requestedDay
) {
  const daysInMonth = new Date(
    year,
    monthIndex + 1,
    0
  ).getDate();

  const dueDay = Math.min(
    requestedDay,
    daysInMonth
  );

  const month = String(monthIndex + 1).padStart(
    2,
    "0"
  );

  const dueDate =
    `${year}-${month}-${String(dueDay).padStart(
      2,
      "0"
    )}`;

  // Days 1–15 belong to the first-half window.
  // Days 16–end belong to the second-half window.
  const windowStartDay =
    requestedDay <= 15 ? 1 : 16;

  const windowStart = new Date(
    year,
    monthIndex,
    windowStartDay
  );

  // Generate exactly five days before the
  // corresponding half-month window begins.
  const generationDate = new Date(windowStart);

  generationDate.setDate(
    generationDate.getDate() - 5
  );

  generationDate.setHours(0, 0, 0, 0);

  return {
    year,
    month,
    dueDay,
    dueDate,
    generationDate,
  };
}

export function useRecurringExpenses(uid) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const generationInProgress = useRef(false);

  useEffect(() => {
    if (!uid) {
      return undefined;
    }

    setLoading(true);
    setError(null);

    return onSnapshot(
      collection(
        db,
        "users",
        uid,
        "recurringExpenses"
      ),
      (snapshot) => {
        setTemplates(
          snapshot.docs
            .map((item) => ({
              id: item.id,
              ...item.data(),
            }))
            .sort(
              (a, b) =>
                Number(a.recurringDay || 0) -
                Number(b.recurringDay || 0)
            )
        );

        setLoading(false);
      },
      (listenerError) => {
        console.error(
          "Recurring listener error:",
          listenerError
        );

        setError(
          "Unable to load recurring expenses."
        );

        setLoading(false);
      }
    );
  }, [uid]);

  useEffect(() => {
    if (
      !uid ||
      loading ||
      generationInProgress.current
    ) {
      return;
    }

    const activeTemplates = templates.filter(
      (template) => template.active
    );

    if (activeTemplates.length === 0) {
      return;
    }

    const generateEligibleExpenses = async () => {
      generationInProgress.current = true;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const currentYear = today.getFullYear();
      const currentMonthIndex = today.getMonth();

      const nextMonthDate = new Date(
        currentYear,
        currentMonthIndex + 1,
        1
      );

      const periodsToCheck = [
        {
          year: currentYear,
          monthIndex: currentMonthIndex,
        },
        {
          year: nextMonthDate.getFullYear(),
          monthIndex: nextMonthDate.getMonth(),
        },
      ];

      try {
        for (const template of activeTemplates) {
          const requestedDay = Number(
            template.recurringDay
          );

          if (
            !Number.isInteger(requestedDay) ||
            requestedDay < 1 ||
            requestedDay > 31
          ) {
            continue;
          }

          for (const period of periodsToCheck) {
            const candidate =
              getGenerationCandidate(
                period.year,
                period.monthIndex,
                requestedDay
              );

            // The generation window has not opened.
            if (
              today < candidate.generationDate
            ) {
              continue;
            }

            const expenseId =
              `${template.id}_${candidate.year}_${candidate.month}`;

            const expenseRef = doc(
              db,
              "users",
              uid,
              "expenses",
              expenseId
            );

            const existingExpense =
              await getDoc(expenseRef);

            if (existingExpense.exists()) {
              continue;
            }

            await setDoc(expenseRef, {
              type: "EXPENSE",

              // Records when Firestore generated it.
              date: getLocalDateString(today),

              // Controls its dashboard month.
              dueDate: candidate.dueDate,

              desc: template.desc,
              status: "ON HOLD",
              amount: Number(template.amount),

              recurring: true,
              recurringDay: candidate.dueDay,
              recurringTemplateId: template.id,

              created: Date.now(),
            });
          }
        }
      } catch (generationError) {
        console.error(
          "Recurring generation error:",
          generationError
        );

        setError(
          "Unable to generate recurring expenses."
        );
      } finally {
        generationInProgress.current = false;
      }
    };

    generateEligibleExpenses();
  }, [uid, templates, loading]);

  return {
    templates,
    loading,
    error,
  };
}