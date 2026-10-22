"use client";

// Add or change one subscription or bill.

import { useState } from "react";
import {
  CYCLES, DEFAULT_CURRENCY, type Cycle, type Expense, type PaymentCard, parseCents, todayLocal,
} from "@/lib/money";
import { MoneySheet, field, hint, label } from "@/components/MoneySheet";

const CURRENCIES = ["EUR", "USD", "GBP"];

interface SpendFormProps {
  /** The one being changed, or nothing when adding. */
  expense?: Expense;
  cards: PaymentCard[];
  onSave: (expense: Expense) => void;
  onClose: () => void;
}

export function SpendForm({ expense, cards, onSave, onClose }: SpendFormProps) {
  const [name, setName] = useState(expense?.name ?? "");
  const [amount, setAmount] = useState(expense ? (expense.amount / 100).toFixed(2) : "");
  const [currency, setCurrency] = useState(expense?.currency ?? DEFAULT_CURRENCY);
  const [cycle, setCycle] = useState<Cycle>(expense?.cycle ?? "monthly");
  const [everyDays, setEveryDays] = useState(String(expense?.everyDays ?? 30));
  const [anchor, setAnchor] = useState(expense?.anchor ?? todayLocal());
  const [cardId, setCardId] = useState(expense?.cardId ?? "");
  const [category, setCategory] = useState(expense?.category ?? "");
  const [trialEndsAt, setTrialEndsAt] = useState(expense?.trialEndsAt ?? "");
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [error, setError] = useState("");

  const save = () => {
    const cents = parseCents(amount);
    if (!name.trim()) return setError("It needs a name.");
    if (cents === null) return setError("That amount does not look like a number.");

    onSave({
      id: expense?.id ?? Date.now().toString(),
      name: name.trim(),
      amount: cents,
      currency,
      cycle,
      ...(cycle === "custom" ? { everyDays: Math.max(1, Number(everyDays) || 30) } : {}),
      anchor,
      status: expense?.status ?? "active",
      ...(cardId ? { cardId } : {}),
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(trialEndsAt ? { trialEndsAt } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(expense?.reviewedAt ? { reviewedAt: expense.reviewedAt } : {}),
      ...(expense?.verdict ? { verdict: expense.verdict } : {}),
      ...(expense?.cancelledAt ? { cancelledAt: expense.cancelledAt } : {}),
    });
    onClose();
  };

  return (
    <MoneySheet
      title={expense ? "Edit cost" : "New subscription or bill"}
      saveLabel={expense ? "Save" : "Add"}
      error={error}
      onSave={save}
      onClose={onClose}
    >
      <div>
        <label className={label}>Name</label>
        <input
          className={field}
          placeholder="Netflix, rent, phone..."
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className={label}>Amount</label>
          <input
            className={field}
            inputMode="decimal"
            placeholder="8.99"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (error) setError("");
            }}
          />
        </div>
        <div>
          <label className={label}>Currency</label>
          <select className={field} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c} className="bg-zinc-900">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>Charged</label>
          <select className={field} value={cycle} onChange={(e) => setCycle(e.target.value as Cycle)}>
            {CYCLES.map((c) => (
              <option key={c.value} value={c.value} className="bg-zinc-900">
                {c.label}
              </option>
            ))}
          </select>
        </div>
        {cycle === "custom" ? (
          <div>
            <label className={label}>Every how many days</label>
            <input className={field} inputMode="numeric" value={everyDays} onChange={(e) => setEveryDays(e.target.value)} />
          </div>
        ) : (
          <div>
            <label className={label}>Next charge</label>
            <input className={field} type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
          </div>
        )}
      </div>

      {cycle === "custom" && (
        <div>
          <label className={label}>Next charge</label>
          <input className={field} type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={label}>Paid from</label>
          <select className={field} value={cardId} onChange={(e) => setCardId(e.target.value)}>
            <option value="" className="bg-zinc-900">
              Not set
            </option>
            {cards.map((c) => (
              <option key={c.id} value={c.id} className="bg-zinc-900">
                {c.label}
                {c.last4 ? ` ·${c.last4}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Category</label>
          <input
            className={field}
            placeholder="streaming, home..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={label}>Free trial ends (optional)</label>
        <input className={field} type="date" value={trialEndsAt} onChange={(e) => setTrialEndsAt(e.target.value)} />
        <p className={hint}>Set this and you get a louder warning before it starts charging.</p>
      </div>

      <div>
        <label className={label}>Notes (optional)</label>
        <input
          className={field}
          placeholder="shared with..., cancel by phone"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </MoneySheet>
  );
}
