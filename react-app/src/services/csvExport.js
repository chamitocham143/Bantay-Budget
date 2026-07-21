function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportMonthlyCsv(month, inflows, expenses) {
  if (inflows.length === 0 && expenses.length === 0) {
    throw new Error("Wala pong records sa napiling buwan.");
  }

  const rows = [["Type", "Date", "Description", "Status", "Amount"]];
  inflows.forEach((item) => rows.push(["Inflow", item.date, item.desc, "N/A", Number(item.amount || 0)]));
  expenses.forEach((item) => rows.push(["Expense", item.dueDate || item.date, item.desc, item.status, Number(item.amount || 0)]));
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Budget Summary for ${month}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
