"use client";

// Add or change one recurring cost.

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import {
  CYCLES, DEFAULT_CURRENCY, type Cycle, type Expense, type PaymentCard, todayLocal,
} from "@/lib/money";

const CURRENCIES = ["EUR", "USD", "GBP"];

const field =
  "w-full bg-black border border-zinc-800 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-cyan-500/60 placeholder:text-zinc-700 font-mono";
const label = "block text-[9px] font-black uppercase tracking-wider text-zinc-600 mb-1.5";

/** "8.99" and "8,99" both mean 899 cents. */
const toCents = (text: string): number | null => {
  const clean = text.replace(/[^\d.,-]/g, "").replace(",", ".");
  if (!clean) return null;
  const value = Number(clean);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
};

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
    const cents = toCents(amount);
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] flex items-end md:items-center justify-center md:p-4"
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="relative bg-[#0a0a0a] border border-zinc-800 w-full md:max-w-md max-h-[92dvh] overflow-y-auto font-mono z-[610] p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black uppercase tracking-wider text-cyan-400">
            {expense ? "Edit cost" : "New recurring cost"}
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-zinc-600 hover:text-cyan-400 transition-colors">
            <X size={18} />
          </button>
        </div>

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
          <p className="text-[10px] text-zinc-700 mt-1.5 leading-relaxed">
            Set this and you get a louder warning before it starts charging.
          </p>
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

        {error && <p className="text-[11px] text-red-400 font-bold">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            className="flex-1 py-2.5 inline-flex items-center justify-center gap-2 border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 text-xs font-black uppercase tracking-wider hover:bg-cyan-500/20 transition-colors"
          >
            <Check size={14} /> {expense ? "Save" : "Add"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-wider hover:border-zinc-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
