"use client";

// Add or change one subscription: anything charged again and again, rent included.

import { useState } from "react";
import { CYCLES, DEFAULT_CURRENCY, type Cycle, type Expense, parseCents, todayLocal } from "@/lib/money";
import { brandLook } from "@/lib/brands";
import { BrandIcon } from "@/components/BrandIcon";
import { MoneySheet, field, hint, label } from "@/components/MoneySheet";

const CURRENCIES = ["EUR", "USD", "GBP"];

interface SubscriptionFormProps {
  /** The one being changed, or nothing when adding. */
  expense?: Expense;
  onSave: (expense: Expense) => void;
  onClose: () => void;
}

export function SubscriptionForm({ expense, onSave, onClose }: SubscriptionFormProps) {
  const [id] = useState(() => expense?.id ?? Date.now().toString());
  const [name, setName] = useState(expense?.name ?? "");
  const [amount, setAmount] = useState(expense ? (expense.amount / 100).toFixed(2) : "");
  const [currency, setCurrency] = useState(expense?.currency ?? DEFAULT_CURRENCY);
  const [cycle, setCycle] = useState<Cycle>(expense?.cycle ?? "monthly");
  const [everyDays, setEveryDays] = useState(String(expense?.everyDays ?? 30));
  const [anchor, setAnchor] = useState(expense?.anchor ?? todayLocal());
  const [category, setCategory] = useState(expense?.category ?? "");
  const [paying, setPaying] = useState(expense?.status !== "paused");
  const [trialEndsAt, setTrialEndsAt] = useState(expense?.trialEndsAt ?? "");
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [error, setError] = useState("");

  const save = () => {
    const cents = parseCents(amount);
    if (!name.trim()) return setError("It needs a name.");
    if (cents === null) return setError("That amount does not look like a number.");

    const status = expense?.status === "cancelled" ? "cancelled" : paying ? "active" : "paused";
    onSave({
      id,
      name: name.trim(),
      amount: cents,
      currency,
      cycle,
      ...(cycle === "custom" ? { everyDays: Math.max(1, Number(everyDays) || 30) } : {}),
      anchor,
      status,
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
      title={expense ? "Edit subscription" : "New subscription"}
      saveLabel={expense ? "Save" : "Add"}
      error={error}
      onSave={save}
      onClose={onClose}
    >
      <div>
        <label className={label}>Name</label>
        <div className="flex items-center gap-2">
          <BrandIcon look={brandLook(name || "?", category)} size="sm" />
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
        <p className={hint}>The logo and colour come from the name.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 min-w-0">
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
        <div className="min-w-0">
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
        <div className="min-w-0">
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
          <div className="min-w-0">
            <label className={label}>Every how many days</label>
            <input className={field} inputMode="numeric" value={everyDays} onChange={(e) => setEveryDays(e.target.value)} />
          </div>
        ) : (
          <div className="min-w-0">
            <label className={label}>Next charge</label>
            <input className={field} type="date" value={anchor} onChange={(e) => e.target.value && setAnchor(e.target.value)} />
          </div>
        )}
      </div>

      {cycle === "custom" && (
        <div>
          <label className={label}>Next charge</label>
          <input className={field} type="date" value={anchor} onChange={(e) => e.target.value && setAnchor(e.target.value)} />
        </div>
      )}

      <div>
        <label className={label}>Category (optional)</label>
        <input
          className={field}
          placeholder="streaming, home, transport..."
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>

      {expense?.status !== "cancelled" && (
        <div>
          <label className={label}>Right now</label>
          <div className="grid grid-cols-2 gap-2">
            {[true, false].map((p) => (
              <button
                key={String(p)}
                type="button"
                onClick={() => setPaying(p)}
                className={`py-2.5 border text-xs font-black uppercase tracking-wider transition-colors ${
                  paying === p
                    ? p
                      ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                      : "border-zinc-500/50 bg-zinc-500/10 text-zinc-300"
                    : "border-zinc-800 text-zinc-600 hover:border-zinc-700"
                }`}
              >
                {p ? "Paying" : "Not paying"}
              </button>
            ))}
          </div>
          <p className={hint}>
            Not paying: kept aside and left out of the budget, like a train pass you only buy for the months you need it.
          </p>
        </div>
      )}

      <div>
        <label className={label}>Free trial ends (optional)</label>
        <input className={field} type="date" value={trialEndsAt} onChange={(e) => setTrialEndsAt(e.target.value)} />
        <p className={hint}>Its card turns yellow until the trial ends and it starts charging.</p>
      </div>

      <div>
        <label className={label}>Notes (optional)</label>
        <textarea
          className={`${field} resize-none`}
          rows={3}
          maxLength={300}
          placeholder="shared with..., cancel by phone"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </MoneySheet>
  );
}
