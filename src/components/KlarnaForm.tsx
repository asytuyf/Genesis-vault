"use client";

// Add or change one Klarna purchase.

import { useState } from "react";
import {
  DEFAULT_CURRENCY, KLARNA_PLANS, type KlarnaPlan, type KlarnaPurchase, defaultFirstDue, formatMoney,
  klarnaPaymentCount, klarnaPayments, parseCents, shortDate, todayLocal,
} from "@/lib/money";
import { MoneySheet, field, hint, label } from "@/components/MoneySheet";

interface KlarnaFormProps {
  /** The one being changed, or nothing when adding. */
  purchase?: KlarnaPurchase;
  onSave: (purchase: KlarnaPurchase) => void;
  onClose: () => void;
}

export function KlarnaForm({ purchase, onSave, onClose }: KlarnaFormProps) {
  const today = todayLocal();
  const [id] = useState(() => purchase?.id ?? Date.now().toString());
  const [name, setName] = useState(purchase?.name ?? "");
  const [amount, setAmount] = useState(purchase ? (purchase.amount / 100).toFixed(2) : "");
  const [boughtOn, setBoughtOn] = useState(purchase?.boughtOn ?? today);
  const [plan, setPlan] = useState<KlarnaPlan>(purchase?.plan ?? "30days");
  const [months, setMonths] = useState(String(purchase?.months ?? 12));
  // Left empty, these follow the plan and the dates until you set them yourself.
  const [firstDue, setFirstDue] = useState<string | null>(purchase?.firstDue ?? null);
  const [paid, setPaid] = useState<number | null>(purchase?.paid ?? null);
  const [error, setError] = useState("");

  const due = firstDue ?? defaultFirstDue(plan, boughtOn);
  const draft: KlarnaPurchase = {
    id,
    name,
    amount: parseCents(amount) ?? 0,
    boughtOn,
    plan,
    months: Math.min(60, Math.max(1, Number(months) || 12)),
    firstDue: due,
    paid: 0,
  };
  const count = klarnaPaymentCount(draft);
  const schedule = klarnaPayments(draft);
  // A payment whose date has passed is taken as made, unless you say otherwise.
  const paidCount = Math.min(count, paid ?? schedule.filter((p) => p.due <= today).length);

  const save = () => {
    const cents = parseCents(amount);
    if (!name.trim()) return setError("Say what you bought.");
    if (!cents) return setError("That amount does not look like a number.");
    onSave({
      id,
      name: name.trim(),
      amount: cents,
      boughtOn,
      plan,
      ...(plan === "monthly" ? { months: count } : {}),
      firstDue: due,
      paid: paidCount,
    });
    onClose();
  };

  return (
    <MoneySheet
      title={purchase ? "Edit Klarna" : "New Klarna purchase"}
      saveLabel={purchase ? "Save" : "Add"}
      error={error}
      onSave={save}
      onClose={onClose}
    >
      <div>
        <label className={label}>What</label>
        <input
          className={field}
          placeholder="Shoes, groceries, laptop..."
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>Amount</label>
          <input
            className={field}
            inputMode="decimal"
            placeholder="60"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (error) setError("");
            }}
          />
        </div>
        <div>
          <label className={label}>Bought on</label>
          <input className={field} type="date" value={boughtOn} onChange={(e) => e.target.value && setBoughtOn(e.target.value)} />
        </div>
      </div>

      <div className={plan === "monthly" ? "grid grid-cols-3 gap-2" : ""}>
        <div className={plan === "monthly" ? "col-span-2" : ""}>
          <label className={label}>Plan</label>
          <select className={field} value={plan} onChange={(e) => setPlan(e.target.value as KlarnaPlan)}>
            {KLARNA_PLANS.map((p) => (
              <option key={p.value} value={p.value} className="bg-zinc-900">
                {p.label}
              </option>
            ))}
          </select>
        </div>
        {plan === "monthly" && (
          <div>
            <label className={label}>Months</label>
            <input className={field} inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} />
          </div>
        )}
      </div>
      {plan === "monthly" && <p className={`${hint} -mt-2`}>Put the total you pay back as the amount, interest included.</p>}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>First payment</label>
          <input className={field} type="date" value={due} onChange={(e) => e.target.value && setFirstDue(e.target.value)} />
        </div>
        <div>
          <label className={label}>Already paid</label>
          <select className={field} value={paidCount} onChange={(e) => setPaid(Number(e.target.value))}>
            {Array.from({ length: count + 1 }, (_, n) => (
              <option key={n} value={n} className="bg-zinc-900">
                {count === 1 ? (n ? "Yes" : "No") : n === 0 ? "None" : `${n} of ${count}`}
              </option>
            ))}
          </select>
        </div>
      </div>
      {draft.amount > 0 && (
        <p className={`${hint} -mt-2`}>
          {count > 4
            ? `${count} payments of ${formatMoney(schedule[count - 1].amount, DEFAULT_CURRENCY)}, ${shortDate(schedule[0].due)} to ${shortDate(schedule[count - 1].due)}`
            : schedule.map((p) => `${formatMoney(p.amount, DEFAULT_CURRENCY)} on ${shortDate(p.due)}`).join(", ")}
        </p>
      )}
    </MoneySheet>
  );
}
