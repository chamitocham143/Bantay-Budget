import { useEffect, useState } from "react";

const faqItems = [
  ["What is Total Income?", "Total Income shows all cash inflows recorded for the selected month."],
  ["What is Total Paid?", "Total Paid shows expenses marked as Paid. Only paid expenses reduce your allocable balance."],
  ["What is Total Pending?", "Total Pending shows expenses waiting to be paid. It is reserved when calculating your Remaining Balance."],
  ["What is Total On Hold?", "Total On Hold shows expenses temporarily outside your active budget. They are displayed but not deducted."],
  ["What is Allocable Balance?", "Allocable Balance is the money available after paid expenses are deducted.", "Total Income − Total Paid"],
  ["What is Remaining Balance?", "Remaining Balance estimates how much will remain after pending expenses are settled.", "Allocable Balance − Total Pending"],
  ["How do recurring expenses work?", "Each active template creates one duplicate-safe expense per month. New generated expenses begin On Hold."],
  ["How does Face ID / Device Unlock work?", "When enabled with App Lock, Bantay Budget uses a passkey to ask your device to verify you after three minutes of inactivity. Your face or fingerprint data stays on your device, and the operating system may offer its secure passcode fallback."],
  ["Are my backups uploaded anywhere?", "No. Exported backup files are downloaded directly to your device and are not stored by Bantay Budget."],
];

function FaqPage({ onClose }) {
  const [openIndex, setOpenIndex] = useState(null);
  useEffect(() => { const old = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = old; }; }, []);

  return (
    <section className="info-page" aria-labelledby="faq-title">
      <header className="settings-header"><button type="button" onClick={onClose} aria-label="Close FAQ">←</button><h1 id="faq-title">FAQ’s</h1><span /></header>
      <div className="info-content">
        <div className="info-hero compact"><span>❔</span><h2>How Bantay Budget works</h2><p>Answers to common questions about your dashboard and data.</p></div>
        <div className="faq-list">
          {faqItems.map(([question, answer, formula], index) => (
            <article className={`faq-item ${openIndex === index ? "open" : ""}`} key={question}>
              <button type="button" aria-expanded={openIndex === index} onClick={() => setOpenIndex(openIndex === index ? null : index)}><span>{question}</span><i>⌄</i></button>
              {openIndex === index && <div><p>{answer}</p>{formula && <code>{formula}</code>}</div>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FaqPage;
