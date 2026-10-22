"use client";

// Log one thing you spent money on, and whether it went on Klarna.

import { useState } from "react";
import { DEFAULT_CURRENCY, type Spend, centsText, formatMoney, parseCents, todayLocal } from "@/lib/money";
import { MoneySheet, field, label } from "@/components/MoneySheet";

interface ExpenseFormProps {
  /** The one being changed, or nothing when adding. */
  spend?: Spend;
  /** Klarna credit still free this month, in cents; null before a budget is set. */
  klarnaLeft: number | null;
  onSave: (spend: Spend) => void;
  onClose: () => void;
}

export function ExpenseForm({ spend, klarnaLeft, onSave, onClose }: ExpenseFormProps) {
  const [id] = useState(() => spend?.id ?? Date.now().toString());
  const [amount, setAmount] = useState(spend ? centsText(spend.amount) : "");
  const [where, setWhere] = useState(spend?.where ?? "");
  const [date, setDate] = useState(spend?.date ?? todayLocal());
  const [klarna, setKlarna] = useState(spend?.klarna ?? false);
  const [error, setError] = useState("");

  // Editing a Klarna expense frees its own amount first.
  const free = klarnaLeft === null ? null : klarnaLeft + (spend?.klarna ? spend.amount : 0);
  const over = free !== null && (parseCents(amount) ?? 0) > free;

  const save = () => {
    const cents = parseCents(amount);
    if (!cents) return setError("How much was it?");
    if (!where.trim()) return setError("Say where you spent it.");
    onSave({ id, amount: cents, where: where.trim(), date, ...(klarna ? { klarna: true } : {}) });
    onClose();
  };

  return (
    <MoneySheet
      title={spend ? "Edit expense" : "New expense"}
      saveLabel={spend ? "Save" : "Add"}
      error={error}
      onSave={save}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>Amount</label>
          <input
            className={field}
            inputMode="decimal"
            placeholder="12.50"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (error) setError("");
            }}
            autoFocus
          />
        </div>
        <div>
          <label className={label}>Date</label>
          <input className={field} type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
      </div>

      <div>
        <label className={label}>Where</label>
        <input
          className={field}
          placeholder="Lidl, bus, cinema..."
          value={where}
          onChange={(e) => {
            setWhere(e.target.value);
            if (error) setError("");
          }}
        />
      </div>

      <div>
        <label className={label}>Paid with</label>
        <div className="grid grid-cols-2 gap-2">
          {[false, true].map((k) => (
            <button
              key={String(k)}
              type="button"
              onClick={() => setKlarna(k)}
              className={`py-2.5 border text-xs font-black uppercase tracking-wider transition-colors ${
                klarna === k
                  ? k
                    ? "border-pink-500/50 bg-pink-500/10 text-pink-400"
                    : "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                  : "border-zinc-800 text-zinc-600 hover:border-zinc-700"
              }`}
            >
              {k ? "Klarna" : "My money"}
            </button>
          ))}
        </div>
        {klarna && free !== null && (
          <p className={`text-[10px] mt-1.5 leading-relaxed ${over ? "text-red-400" : "text-zinc-700"}`}>
            {formatMoney(Math.max(0, free), DEFAULT_CURRENCY)} of Klarna credit left this month. It comes out of next
            month&apos;s budget.
          </p>
        )}
      </div>
    </MoneySheet>
  );
}
