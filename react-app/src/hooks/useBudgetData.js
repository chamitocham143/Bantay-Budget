import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

export function getLocalMonthString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function byCreatedDescending(a, b) {
  return Number(b.created || 0) - Number(a.created || 0);
}

function expenseMonth(expense) {
  const relevantDate = expense.recurring
    ? expense.dueDate || expense.date
    : expense.date;

  return relevantDate?.slice(0, 7) || "";
}

export function useBudgetData(uid, selectedMonth) {
  const [inflows, setInflows] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loaded, setLoaded] = useState({ inflows: false, expenses: false });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;

    setLoaded({ inflows: false, expenses: false });
    setError(null);

    const unsubscribeInflows = onSnapshot(
      collection(db, "users", uid, "inflows"),
      (snapshot) => {
        setInflows(
          snapshot.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .sort(byCreatedDescending),
        );
        setLoaded((current) => ({ ...current, inflows: true }));
      },
      (listenerError) => {
        console.error("Inflows listener error:", listenerError);
        setError("Unable to load income data.");
        setLoaded((current) => ({ ...current, inflows: true }));
      },
    );

    const unsubscribeExpenses = onSnapshot(
      collection(db, "users", uid, "expenses"),
      (snapshot) => {
        setExpenses(
          snapshot.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .sort(byCreatedDescending),
        );
        setLoaded((current) => ({ ...current, expenses: true }));
      },
      (listenerError) => {
        console.error("Expenses listener error:", listenerError);
        setError("Unable to load expense data.");
        setLoaded((current) => ({ ...current, expenses: true }));
      },
    );

    return () => {
      unsubscribeInflows();
      unsubscribeExpenses();
    };
  }, [uid]);

  const filteredInflows = useMemo(
    () =>
      inflows.filter(
        (item) =>
          !selectedMonth ||
          item.date?.startsWith(selectedMonth) ||
          item.month === selectedMonth,
      ),
    [inflows, selectedMonth],
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter(
        (item) => !selectedMonth || expenseMonth(item) === selectedMonth,
      ),
    [expenses, selectedMonth],
  );

  const totals = useMemo(() => {
    const inflowTotal = filteredInflows.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const expenseTotals = filteredExpenses.reduce(
      (summary, item) => {
        const amount = Number(item.amount || 0);
        if (item.status === "PAID") summary.paidTotal += amount;
        if (item.status === "PENDING") summary.pendingTotal += amount;
        if (item.status === "ON HOLD") summary.onHoldTotal += amount;
        return summary;
      },
      { paidTotal: 0, pendingTotal: 0, onHoldTotal: 0 },
    );

    const allocable = inflowTotal - expenseTotals.paidTotal;
    const available = allocable - expenseTotals.pendingTotal;

    return { inflowTotal, ...expenseTotals, allocable, available };
  }, [filteredInflows, filteredExpenses]);

 return {
  inflows: filteredInflows,
  expenses: filteredExpenses,

  // Complete history for Analytics
  allInflows: inflows,
  allExpenses: expenses,

  totals,
  loading: !loaded.inflows || !loaded.expenses,
  error,
};

}
