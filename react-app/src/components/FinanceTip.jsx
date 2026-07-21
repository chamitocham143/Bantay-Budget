const financeTips = [
  ["💰", "Pay yourself first. Save before spending."],
  ["📈", "Track every expense, even the smallest ones."],
  ["💳", "Avoid carrying credit card balances whenever possible."],
  ["🏦", "Build an emergency fund covering 3–6 months of expenses."],
  ["📅", "Pay bills before their due date to avoid penalties."],
  ["🛒", "Create a shopping list to reduce impulse purchases."],
  ["🚗", "Review recurring subscriptions every few months."],
  ["📊", "Review your budget at least once every month."],
  ["🌱", "Small savings made consistently grow over time."],
  ["🎯", "Set realistic financial goals and celebrate your progress."],
  ["💵", "Spend less than you earn every month."],
  ["📚", "Invest in learning—financial knowledge pays lifelong dividends."],
];

function getDailyTip() {
  const today = new Date().toDateString();
  const savedDate = localStorage.getItem("financeTipDate");
  let index = Number(localStorage.getItem("financeTipIndex"));
  if (savedDate !== today || !Number.isInteger(index) || index < 0 || index >= financeTips.length) {
    index = Math.floor(Math.random() * financeTips.length);
    localStorage.setItem("financeTipDate", today);
    localStorage.setItem("financeTipIndex", String(index));
  }
  return financeTips[index];
}

function FinanceTip() {
  const [icon, text] = getDailyTip();
  return <aside className="finance-tip"><span aria-hidden="true">{icon}</span><div><strong>Daily finance tip</strong><p>{text}</p></div></aside>;
}

export default FinanceTip;
