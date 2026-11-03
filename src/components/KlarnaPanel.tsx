"use client";

// Klarna in one box, a month at a time: what you used, what you paid back so
// far, and what is left to pay. Payments are logged as separate sums, each one
// paying back a month of your choosing.

import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { DEFAULT_CURRENCY, type KlarnaMonth, type KlarnaPayment, type Spend, formatMoney, shortDate } from "@/lib/money";
import { BrandIcon } from "@/components/BrandIcon";

const eur = (cents: number) => formatMoney(cents, DEFAULT_CURRENCY);
const KLARNA = { icon: "klarna", color: "#FFB3C7" };
/** Payments shown before "show all". */
const RECENT = 5;

interface KlarnaPanelProps {
  current: KlarnaMonth;
  last: KlarnaMonth;
  /** Older months still not paid off. */
  earlier: KlarnaMonth[];
  /** Every payment, newest first. */
  payments: KlarnaPayment[];
  /** Name of the month a payment is for: "last month", "this month", "25 Aug – 24 Sep". */
  forLabel: (payment: KlarnaPayment) => string;
  /** Credit allowed per month, or null before a budget is set. */
  limit: number | null;
  today: string;
  onAddPayment: () => void;
  onEditPayment: (payment: KlarnaPayment) => void;
  onDeletePayment: (payment: KlarnaPayment) => void;
  /** Log a Klarna purchase dated inside the given month. */
  onAddPurchase: (date: string) => void;
  onEditPurchase: (spend: Spend) => void;
}

const Stat = ({ label, value, tone = "text-zinc-300" }: { label: string; value: number; tone?: string }) => (
  <div className="min-w-0">
    <div className="text-[9px] font-black uppercase tracking-wider text-zinc-600 leading-tight">{label}</div>
    <div className={`text-base font-black mt-1 wrap-anywhere ${tone}`}>{eur(value)}</div>
  </div>
);

function MonthRow({
  title,
  month,
  addDate,
  onAddPurchase,
  onEditPurchase,
}: {
  title: string;
  month: KlarnaMonth;
  addDate: string;
  onAddPurchase: (date: string) => void;
  onEditPurchase: (spend: Spend) => void;
}) {
  const [open, setOpen] = useState(false);
  const done = month.used > 0 && month.left <= 0;
  const share = month.used > 0 ? Math.min(100, (month.paid / month.used) * 100) : 0;

  return (
    <div className="p-3 border border-zinc-900 bg-black/40">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 text-left">
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-300">{title}</span>
        <span className="text-[10px] text-zinc-600 uppercase wrap-break-word min-w-0">
          {shortDate(month.start)} – {shortDate(month.end)}
        </span>
        {done && <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500">paid off</span>}
        <ChevronDown size={14} className={`ml-auto shrink-0 text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <div className="grid grid-cols-3 gap-3 mt-3">
        <Stat label="Used" value={month.used} />
        <Stat label="Paid back" value={month.paid} />
        <Stat label="Left to pay" value={Math.max(0, month.left)} tone={month.left > 0 ? "text-pink-300" : "text-zinc-500"} />
      </div>
      {month.used > 0 && (
        <div className="h-1 mt-3 bg-zinc-900 overflow-hidden">
          <div className="h-full bg-emerald-500/70" style={{ width: `${share}%` }} />
        </div>
      )}

      {!open && month.purchases.length === 0 && (
        <button
          onClick={() => onAddPurchase(addDate)}
          className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-black uppercase tracking-wider text-pink-400 hover:text-pink-300 transition-colors"
        >
          <Plus size={12} /> Add what you used
        </button>
      )}

      {open && (
        <div className="mt-3 space-y-1">
          {month.purchases.length === 0 && (
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Nothing on Klarna logged for this month. Add what you used, one purchase at a time or as one total.
            </p>
          )}
          {month.purchases.map((s) => (
            <button
              key={s.id}
              onClick={() => onEditPurchase(s)}
              className="w-full flex items-center gap-3 p-2 border border-zinc-900 bg-black/30 text-left hover:border-zinc-800 transition-colors"
            >
              <span className="text-[10px] text-zinc-600 uppercase whitespace-nowrap">{shortDate(s.date)}</span>
              <span className="text-sm text-zinc-300 flex-1 min-w-0 wrap-break-word">{s.where}</span>
              <span className="text-sm font-black text-zinc-300 whitespace-nowrap">{eur(s.amount)}</span>
            </button>
          ))}
          <button
            onClick={() => onAddPurchase(addDate)}
            className="inline-flex items-center gap-1.5 pt-1 text-[10px] font-black uppercase tracking-wider text-pink-400 hover:text-pink-300 transition-colors"
          >
            <Plus size={12} /> Add what you used
          </button>
        </div>
      )}
    </div>
  );
}

export function KlarnaPanel({
  current,
  last,
  earlier,
  payments,
  forLabel,
  limit,
  today,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
  onAddPurchase,
  onEditPurchase,
}: KlarnaPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const over = limit !== null && current.used > limit;
  const shown = showAll ? payments : payments.slice(0, RECENT);

  return (
    <div className="mt-3 p-4 border border-pink-500/25 bg-pink-500/[0.03]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <BrandIcon look={KLARNA} size="sm" />
        <span className="text-xs font-black uppercase tracking-[0.2em] text-pink-300">Klarna</span>
        {limit !== null && (
          <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider ${over ? "text-red-400" : "text-zinc-500"}`}>
            {over
              ? `${eur(current.used - limit)} over this month's credit`
              : `${eur(limit - current.used)} of ${eur(limit)} credit left this month`}
          </span>
        )}
      </div>

      {limit !== null && limit > 0 && (
        <div className="h-1.5 mt-3 bg-zinc-900 overflow-hidden">
          <div
            className={`h-full ${over ? "bg-red-400" : "bg-pink-400"}`}
            style={{ width: `${Math.min(100, (current.used / limit) * 100)}%` }}
          />
        </div>
      )}

      <div className="mt-4 space-y-2">
        {earlier.map((m) => (
          <MonthRow
            key={m.start}
            title="Earlier"
            month={m}
            addDate={m.start}
            onAddPurchase={onAddPurchase}
            onEditPurchase={onEditPurchase}
          />
        ))}
        <MonthRow title="Last month" month={last} addDate={last.start} onAddPurchase={onAddPurchase} onEditPurchase={onEditPurchase} />
        <MonthRow
          title="This month"
          month={current}
          addDate={today}
          onAddPurchase={onAddPurchase}
          onEditPurchase={onEditPurchase}
        />
      </div>

      <button
        onClick={onAddPayment}
        className="mt-4 w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 border border-pink-500/30 text-pink-300 text-xs font-black uppercase tracking-wider hover:bg-pink-500/10 transition-colors"
      >
        <Plus size={14} /> Add a payment
      </button>

      {payments.length > 0 && (
        <div className="mt-4 space-y-1">
          <div className="text-[9px] font-black uppercase tracking-wider text-zinc-600 mb-2">Payments to Klarna</div>
          {shown.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-2.5 border border-zinc-900 bg-black/30">
              <button onClick={() => onEditPayment(p)} aria-label="Edit payment" className="min-w-0 flex-1 text-left">
                <span className="block text-sm text-zinc-300 leading-snug">{eur(p.amount)}</span>
                <span className="block text-[10px] uppercase tracking-wider mt-0.5 text-zinc-600 wrap-break-word">
                  paid {shortDate(p.date)} · for {forLabel(p)}
                </span>
              </button>
              <button
                onClick={() => (confirmId === p.id ? onDeletePayment(p) : setConfirmId(p.id))}
                onBlur={() => setConfirmId((id) => (id === p.id ? null : id))}
                aria-label={confirmId === p.id ? "Tap again to delete" : "Delete payment"}
                className={`shrink-0 p-1.5 transition-colors ${confirmId === p.id ? "text-red-400" : "text-zinc-700 hover:text-red-400"}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {payments.length > RECENT && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center gap-1.5 pt-2 text-[10px] font-black uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <ChevronDown size={12} className={`transition-transform ${showAll ? "rotate-180" : ""}`} />
              {showAll ? "Show fewer" : `Show all ${payments.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
