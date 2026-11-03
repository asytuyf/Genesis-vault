"use client";

// One subscription as a card: its logo and colour, what it costs, when it is
// next charged, and its notes.

import { useState } from "react";
import { Pencil, Trash2, Power, Scissors, HandCoins } from "lucide-react";
import {
  type Expense, cycleLabel, dayDate, daysBetween, formatMoney, nextPayment, scheduleLabel, shortDate, whenLabel,
  yearlyCost,
} from "@/lib/money";
import { brandLook, tint } from "@/lib/brands";
import { BrandIcon } from "@/components/BrandIcon";

const TONES = {
  plain: "border-zinc-800 bg-zinc-900/60 text-zinc-400",
  red: "border-red-500/40 bg-red-500/10 text-red-300",
  yellow: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
} as const;

export type Tone = keyof typeof TONES;

export const Tag = ({ tone = "plain", children }: { tone?: Tone; children: React.ReactNode }) => (
  <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${TONES[tone]}`}>
    {children}
  </span>
);

/** Today and tomorrow in red, the rest of the week in yellow. */
export const dueTone = (date: string, today: string): Tone => {
  const days = daysBetween(date, today);
  return days <= 1 ? "red" : days <= 7 ? "yellow" : "plain";
};

const action =
  "inline-flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-500 transition-colors";

interface SubscriptionCardProps {
  expense: Expense;
  today: string;
  /** Day of a one-off payment made this month, for something not paid regularly. */
  paidOnce?: string;
  onEdit: () => void;
  onPaying: (paying: boolean) => void;
  onCancelled: () => void;
  onDelete: () => void;
  onPayOnce: () => void;
}

export function SubscriptionCard({
  expense: e,
  today,
  paidOnce,
  onEdit,
  onPaying,
  onCancelled,
  onDelete,
  onPayOnce,
}: SubscriptionCardProps) {
  const [confirm, setConfirm] = useState<"delete" | "pay" | null>(null);
  const look = brandLook(e.name, e.category);
  const paying = e.status === "active";
  const next = paying ? nextPayment(e, today) : null;
  const trial = paying && !!e.trialEndsAt && e.trialEndsAt > today;
  const color = look.color;
  const money = (cents: number) => formatMoney(cents, e.currency);

  return (
    <div
      className={`relative flex flex-col gap-3 p-4 border bg-[#0a0a0a] overflow-hidden ${paying ? "" : "opacity-70"}`}
      style={{
        borderColor: trial ? "rgba(234, 179, 8, 0.5)" : tint(color, paying ? 0.3 : 0.15),
        backgroundImage: `radial-gradient(130% 90% at 100% 0%, ${tint(color, paying ? 0.16 : 0.07)}, transparent 60%)`,
      }}
    >
      <span className="absolute inset-x-0 top-0 h-[2px]" style={{ backgroundColor: trial ? "#EAB308" : color }} />

      <div className="flex items-start gap-3">
        <BrandIcon look={look} muted={!paying} />
        <div className="min-w-0 flex-1">
          <div className="text-base font-black text-white leading-tight wrap-break-word">{e.name}</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1 wrap-break-word">
            {scheduleLabel(e)}
            {e.category && ` · ${e.category}`}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-black leading-tight whitespace-nowrap" style={{ color: paying ? color : "#A1A1AA" }}>
            {money(e.amount)}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-zinc-600 whitespace-nowrap">{cycleLabel(e)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {paying && next && <Tag tone={dueTone(next, today)}>{whenLabel(next, today)}</Tag>}
        {paying && next && <Tag>{dayDate(next)}</Tag>}
        {trial && <Tag tone="yellow">free until {shortDate(e.trialEndsAt!)}</Tag>}
        {paying && <Tag>{money(yearlyCost(e))} a year</Tag>}
        {!paying && <Tag>not paying right now</Tag>}
        {!paying && paidOnce && <Tag tone="cyan">paid {shortDate(paidOnce)}</Tag>}
      </div>

      {e.notes && (
        <p
          className="text-[12px] leading-relaxed text-zinc-400 whitespace-pre-line wrap-break-word border-l-2 pl-3"
          style={{ borderColor: tint(color, 0.45) }}
        >
          {e.notes}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-1 mt-auto pt-2 -mx-2 -mb-1 border-t border-zinc-900">
        {!paying && (
          <button
            onClick={() => {
              // A second payment in the same month asks first, against a double tap.
              if (paidOnce && confirm !== "pay") return setConfirm("pay");
              setConfirm(null);
              onPayOnce();
            }}
            onBlur={() => setConfirm((c) => (c === "pay" ? null : c))}
            className={`${action} text-cyan-400 hover:text-cyan-300`}
          >
            <HandCoins size={13} /> {confirm === "pay" ? "Pay again?" : "Pay once"}
          </button>
        )}
        <button onClick={onEdit} className={`${action} hover:text-cyan-400`}>
          <Pencil size={12} /> Edit
        </button>
        <button onClick={() => onPaying(!paying)} className={`${action} hover:text-yellow-400`}>
          <Power size={12} /> {paying ? "Not paying" : "Paying again"}
        </button>
        {paying && (
          <button onClick={onCancelled} className={`${action} hover:text-emerald-400`}>
            <Scissors size={12} /> Cancelled
          </button>
        )}
        <button
          onClick={() => (confirm === "delete" ? onDelete() : setConfirm("delete"))}
          onBlur={() => setConfirm((c) => (c === "delete" ? null : c))}
          aria-label="Delete"
          className={`${action} ml-auto ${confirm === "delete" ? "text-red-400" : "text-zinc-700 hover:text-red-400"}`}
        >
          <Trash2 size={12} /> {confirm === "delete" && "Delete?"}
        </button>
      </div>
    </div>
  );
}
