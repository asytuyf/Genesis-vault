"use client";

// Set what you live on each month, the day it arrives, and your Klarna limit.

import { useState } from "react";
import { type Budget, parseCents } from "@/lib/money";
import { MoneySheet, field, hint, label } from "@/components/MoneySheet";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

interface BudgetFormProps {
  budget?: Budget;
  onSave: (set: Omit<Budget, "id">) => void;
  onClose: () => void;
}

export function BudgetForm({ budget, onSave, onClose }: BudgetFormProps) {
  const [income, setIncome] = useState(budget ? (budget.income / 100).toFixed(2) : "");
  const [payday, setPayday] = useState(budget?.payday ?? 1);
  const [limit, setLimit] = useState(budget?.klarnaLimit ? (budget.klarnaLimit / 100).toFixed(2) : "");
  const [error, setError] = useState("");

  const save = () => {
    const cents = parseCents(income);
    const limitCents = limit.trim() ? parseCents(limit) : 0;
    if (cents === null) return setError("The budget does not look like a number.");
    if (limitCents === null) return setError("The Klarna limit does not look like a number.");
    onSave({ income: cents, payday, klarnaLimit: limitCents });
    onClose();
  };

  return (
    <MoneySheet title="Monthly budget" saveLabel="Save" error={error} onSave={save} onClose={onClose}>
      <div>
        <label className={label}>Money in per month</label>
        <input
          className={field}
          inputMode="decimal"
          placeholder="900"
          value={income}
          onChange={(e) => {
            setIncome(e.target.value);
            if (error) setError("");
          }}
          autoFocus
        />
        <p className={hint}>Everything you live on in a month, all sources together.</p>
      </div>

      <div>
        <label className={label}>It arrives on day</label>
        <select className={field} value={payday} onChange={(e) => setPayday(Number(e.target.value))}>
          {DAYS.map((d) => (
            <option key={d} value={d} className="bg-zinc-900">
              {d}
            </option>
          ))}
        </select>
        <p className={hint}>Your month runs from this day to the day before the next one.</p>
      </div>

      <div>
        <label className={label}>Klarna limit per month (optional)</label>
        <input
          className={field}
          inputMode="decimal"
          placeholder="200"
          value={limit}
          onChange={(e) => {
            setLimit(e.target.value);
            if (error) setError("");
          }}
        />
        <p className={hint}>The most you allow yourself to buy with Klarna in one month.</p>
      </div>
    </MoneySheet>
  );
}
