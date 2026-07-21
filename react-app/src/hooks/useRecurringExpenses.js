import { useEffect, useRef, useState } from "react";
import { collection, doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { getLocalDateString } from "../utils/dates.js";

function currentPeriod(date = new Date()) {
  return {
    year: date.getFullYear(),
    month: String(date.getMonth() + 1).padStart(2, "0"),
  };
}

export function useRecurringExpenses(uid) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const generationInProgress = useRef(false);

  useEffect(() => {
    if (!uid) return undefined;
    setLoading(true);
    setError(null);

    return onSnapshot(
      collection(db, "users", uid, "recurringExpenses"),
      (snapshot) => {
        setTemplates(
          snapshot.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .sort((a, b) => Number(a.recurringDay || 0) - Number(b.recurringDay || 0)),
        );
        setLoading(false);
      },
      (listenerError) => {
        console.error("Recurring listener error:", listenerError);
        setError("Unable to load recurring expenses.");
        setLoading(false);
      },
    );
  }, [uid]);

  useEffect(() => {
    if (!uid || loading || generationInProgress.current) return;
    const activeTemplates = templates.filter((template) => template.active);
    if (activeTemplates.length === 0) return;

    const generateCurrentMonth = async () => {
      generationInProgress.current = true;
      const today = new Date();
      const { year, month } = currentPeriod(today);
      const daysInMonth = new Date(year, Number(month), 0).getDate();

      try {
        for (const template of activeTemplates) {
          const requestedDay = Number(template.recurringDay);
          if (!requestedDay) continue;
          const dueDay = Math.min(requestedDay, daysInMonth);
          const dueDate = `${year}-${month}-${String(dueDay).padStart(2, "0")}`;
          const expenseId = `${template.id}_${year}_${month}`;
          const expenseRef = doc(db, "users", uid, "expenses", expenseId);
          const existingExpense = await getDoc(expenseRef);

          if (!existingExpense.exists()) {
            await setDoc(expenseRef, {
              type: "EXPENSE",
              date: getLocalDateString(today),
              dueDate,
              desc: template.desc,
              status: "ON HOLD",
              amount: Number(template.amount),
              recurring: true,
              recurringDay: dueDay,
              recurringTemplateId: template.id,
              created: Date.now(),
            });
          }
        }
      } catch (generationError) {
        console.error("Recurring generation error:", generationError);
        setError("Unable to generate this month's recurring expenses.");
      } finally {
        generationInProgress.current = false;
      }
    };

    generateCurrentMonth();
  }, [uid, templates, loading]);

  return { templates, loading, error };
}
