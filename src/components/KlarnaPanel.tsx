"use client";

// Klarna in one box: the month's credit, what you still owe and what you have
// paid back. Each Klarna expense is ticked off once it is paid back.

import { useState } from "react";
import { Check, ChevronDown, Undo2 } from "lucide-react";
import { DEFAULT_CURRENCY, type Spend, formatMoney, klarnaTotals, shortDate } from "@/lib/money";
import { BrandIcon } from "@/components/BrandIcon";

const eur = (cents: number) => formatMoney(cents, DEFAULT_CURRENCY);
const KLARNA = { icon: "klarna", color: "#FFB3C7" };

interface KlarnaPanelProps {
  spending: Spend[];
  /** The budget month on show. */
  start: string;
  end: string;
  /** Credit allowed per month, or null before a budget is set. */
  limit: number | null;
  today: string;
  /** Sends changed expenses back, several at once for "mark all paid". */
  onSave: (spends: Spend[]) => void;
}

const Stat = ({ label, value, strong }: { label: string; value: number; strong?: boolean }) => (
  <div className="min-w-0">
    <div className="text-[9px] font-black uppercase tracking-wider text-zinc-600 leading-tight">{label}</div>
    <div className={`text-base font-black mt-1 wrap-anywhere ${strong && value > 0 ? "text-pink-300" : "text-zinc-300"}`}>
      {eur(value)}
    </div>
  </div>
);

export function KlarnaPanel({ spending, start, end, limit, today, onSave }: KlarnaPanelProps) {
  const [showPaid, setShowPaid] = useState(false);
  const totals = klarnaTotals(spending, start, end);
  const all = spending.filter((s) => s.klarna);
  const unpaid = all.filter((s) => !s.paid).sort((a, b) => a.date.localeCompare(b.date));
  const paid = all.filter((s) => s.paid).sort((a, b) => b.paid!.localeCompare(a.paid!) || b.date.localeCompare(a.date));
  const paidTotal = paid.reduce((sum, s) => sum + s.amount, 0);
  const over = limit !== null && totals.used > limit;

  const markPaid = (list: Spend[]) => onSave(list.map((s) => ({ ...s, paid: today })));
  const markUnpaid = (s: Spend) => {
    const rest = { ...s };
    delete rest.paid;
    onSave([rest]);
  };

  return (
    <div className="mt-3 p-4 border border-pink-500/25 bg-pink-500/[0.03]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <BrandIcon look={KLARNA} size="sm" />
        <span className="text-xs font-black uppercase tracking-[0.2em] text-pink-300">Klarna</span>
        {limit !== null && (
          <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider ${over ? "text-red-400" : "text-zinc-500"}`}>
            {eur(totals.used)} of {eur(limit)} credit used
          </span>
        )}
      </div>

      {limit !== null && limit > 0 && (
        <div className="h-1.5 mt-3 bg-zinc-900 overflow-hidden">
          <div
            className={`h-full ${over ? "bg-red-400" : "bg-pink-400"}`}
            style={{ width: `${Math.min(100, (totals.used / limit) * 100)}%` }}
          />
        </div>
      )}

      {all.length === 0 ? (
        <p className="text-[11px] text-zinc-600 mt-3 leading-relaxed">
          Nothing on Klarna. When you add an expense, pick Klarna under &quot;Paid with&quot;.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Stat label="To pay now" value={totals.due} strong />
            <Stat label="Next month" value={totals.next} />
            <Stat label="Paid back this month" value={totals.paid} />
          </div>

          {unpaid.length > 0 && (
            <div className="mt-4 space-y-1">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-600">Still to pay back</span>
                {unpaid.length > 1 && (
                  <button
                    onClick={() => markPaid(unpaid)}
                    className="text-[10px] font-black uppercase tracking-wider text-pink-400 hover:text-pink-300 transition-colors"
                  >
                    Mark all paid
                  </button>
                )}
              </div>
              {unpaid.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 border border-zinc-900 bg-black/40">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-zinc-200 leading-snug wrap-break-word">{s.where}</div>
                    <div className="text-[10px] uppercase tracking-wider mt-0.5 text-zinc-600">
                      {shortDate(s.date)} ·{" "}
                      {s.date < start ? <span className="text-pink-300">pay now</span> : "pay next month"}
                    </div>
                  </div>
                  <span className="text-sm font-black text-zinc-200 whitespace-nowrap">{eur(s.amount)}</span>
                  <button
                    onClick={() => markPaid([s])}
                    className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 border border-pink-500/30 text-pink-300 text-[10px] font-black uppercase tracking-wider hover:bg-pink-500/10 transition-colors"
                  >
                    <Check size={12} /> Paid
                  </button>
                </div>
              ))}
            </div>
          )}

          {paid.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowPaid(!showPaid)}
                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <ChevronDown size={12} className={`transition-transform ${showPaid ? "rotate-180" : ""}`} />
                Paid back: {eur(paidTotal)} in total
              </button>
              {showPaid && (
                <div className="mt-2 space-y-1">
                  {paid.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-2.5 border border-zinc-900 bg-black/30">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-zinc-400 leading-snug wrap-break-word">{s.where}</div>
                        <div className="text-[10px] uppercase tracking-wider mt-0.5 text-zinc-600">
                          bought {shortDate(s.date)} · paid back {shortDate(s.paid!)}
                        </div>
                      </div>
                      <span className="text-sm font-black text-zinc-400 whitespace-nowrap">{eur(s.amount)}</span>
                      <button
                        onClick={() => markUnpaid(s)}
                        title="Not paid back after all"
                        aria-label="Undo paid back"
                        className="shrink-0 p-1.5 text-zinc-700 hover:text-pink-300 transition-colors"
                      >
                        <Undo2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
