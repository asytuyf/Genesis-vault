"use client";

// Log one payment to Klarna: how much, and whose credit it pays back. It is
// dated today by itself. Pay in as many parts as you like; each comes off what
// is left.

import { useState } from "react";
import { DEFAULT_CURRENCY, type KlarnaPayment, centsText, formatMoney, parseCents, todayLocal } from "@/lib/money";
import { MoneySheet, field, hint, label } from "@/components/MoneySheet";

export interface MonthChoice {
  /** Any day inside the month; stored as the payment's "for". */
  start: string;
  label: string;
  /** Still to pay back on it, in cents. */
  left: number;
}

interface KlarnaPaymentFormProps {
  /** The one being changed, or nothing when adding. */
  payment?: KlarnaPayment;
  /** Months it can pay back, oldest first. */
  months: MonthChoice[];
  /** The month picked to start with. */
  initialFor: string;
  onSave: (payment: KlarnaPayment) => void;
  onClose: () => void;
}

export function KlarnaPaymentForm({ payment, months, initialFor, onSave, onClose }: KlarnaPaymentFormProps) {
  const [id] = useState(() => payment?.id ?? Date.now().toString());
  const [amount, setAmount] = useState(payment ? centsText(payment.amount) : "");
  const [date] = useState(() => payment?.date ?? todayLocal());
  const [forMonth, setForMonth] = useState(initialFor);
  const [error, setError] = useState("");

  const chosen = months.find((m) => m.start === forMonth);
  // Editing a payment frees its own amount first.
  const left = chosen ? chosen.left + (payment && initialFor === forMonth ? payment.amount : 0) : null;

  const save = () => {
    const cents = parseCents(amount);
    if (!cents) return setError("How much did you pay?");
    onSave({ id, amount: cents, date, for: forMonth });
    onClose();
  };

  return (
    <MoneySheet
      title={payment ? "Edit payment" : "Pay Klarna"}
      saveLabel={payment ? "Save" : "Add"}
      error={error}
      onSave={save}
      onClose={onClose}
    >
      <div>
        <div>
          <label className={label}>Amount paid</label>
          <input
            className={field}
            inputMode="decimal"
            placeholder={left && left > 0 ? centsText(left) : "50"}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (error) setError("");
            }}
            autoFocus
          />
        </div>
      </div>

      <div>
        <label className={label}>It pays back</label>
        <div className="grid grid-cols-2 gap-2">
          {months.map((m) => (
            <button
              key={m.start}
              type="button"
              onClick={() => setForMonth(m.start)}
              className={`py-2.5 px-2 border text-left transition-colors ${
                forMonth === m.start
                  ? "border-pink-500/50 bg-pink-500/10 text-pink-300"
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
              }`}
            >
              <span className="block text-xs font-black uppercase tracking-wider">{m.label}</span>
              <span className="block text-[10px] mt-0.5 opacity-80">{formatMoney(Math.max(0, m.left), DEFAULT_CURRENCY)} left</span>
            </button>
          ))}
        </div>
        <p className={hint}>
          Pay in as many parts as you like. Each one comes off what is left.
          {left !== null && ` ${formatMoney(Math.max(0, left), DEFAULT_CURRENCY)} left before this one.`}
        </p>
      </div>
    </MoneySheet>
  );
}
