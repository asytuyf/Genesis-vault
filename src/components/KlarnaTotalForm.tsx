"use client";

// Say how much you owe Klarna for a month, as one amount. Purchases logged one
// by one with "Paid with: Klarna" count towards it.

import { useState } from "react";
import { DEFAULT_CURRENCY, centsText, formatMoney, parseCents } from "@/lib/money";
import { MoneySheet, field, hint, label } from "@/components/MoneySheet";

interface KlarnaTotalFormProps {
  title: string;
  /** What the month comes to now, in cents. */
  owed: number;
  /** Of that, purchases logged one by one, in cents. */
  logged: number;
  /** Sends the new total for the month. */
  onSave: (total: number) => void;
  onClose: () => void;
}

export function KlarnaTotalForm({ title, owed, logged, onSave, onClose }: KlarnaTotalFormProps) {
  const [amount, setAmount] = useState(owed ? centsText(owed) : "");
  const [error, setError] = useState("");

  const save = () => {
    const cents = amount.trim() ? parseCents(amount) : 0;
    if (cents === null) return setError("That amount does not look like a number.");
    if (cents < logged) return setError(`You already logged ${formatMoney(logged, DEFAULT_CURRENCY)} of purchases for it.`);
    onSave(cents);
    onClose();
  };

  return (
    <MoneySheet title={title} saveLabel="Save" error={error} onSave={save} onClose={onClose}>
      <div>
        <label className={label}>You owe Klarna</label>
        <input
          className={field}
          inputMode="decimal"
          placeholder="250"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            if (error) setError("");
          }}
          autoFocus
        />
        <p className={hint}>
          Everything you put on Klarna for it, together. Payments you add come off this.
          {logged > 0 && ` It includes the ${formatMoney(logged, DEFAULT_CURRENCY)} of purchases you logged one by one.`}
        </p>
      </div>
    </MoneySheet>
  );
}
