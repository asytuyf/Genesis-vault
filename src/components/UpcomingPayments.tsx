"use client";

// What is about to be charged: the next payment on its own, big, and below it
// everything due in the next 30 days, with payday marked where it falls.

import { Fragment } from "react";
import { type Expense, dayDate, formatMoney, whenLabel } from "@/lib/money";
import { brandLook, tint } from "@/lib/brands";
import { BrandIcon } from "@/components/BrandIcon";
import { Tag, dueTone } from "@/components/SubscriptionCard";

type Charge = { expense: Expense; date: string };

const TONE_TEXT = { plain: "text-zinc-500", red: "text-red-400", yellow: "text-yellow-400", cyan: "text-cyan-400" } as const;

/** The closest payment, as a big card. */
export function NextPayment({ charge, today }: { charge: Charge; today: string }) {
  const { expense: e, date } = charge;
  const look = brandLook(e.name, e.category);
  return (
    <div
      className="relative overflow-hidden border p-4 sm:p-5"
      style={{
        borderColor: tint(look.color, 0.45),
        backgroundImage: `linear-gradient(135deg, ${tint(look.color, 0.2)}, transparent 65%)`,
      }}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: look.color }}>
        Next payment
      </div>
      <div className="flex items-center gap-3 sm:gap-4 mt-3">
        <BrandIcon look={look} />
        <div className="min-w-0 flex-1">
          <div className="text-lg sm:text-xl font-black text-white leading-tight wrap-break-word">{e.name}</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Tag tone={dueTone(date, today)}>{whenLabel(date, today)}</Tag>
            <Tag>{dayDate(date)}</Tag>
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black whitespace-nowrap" style={{ color: look.color }}>
          {formatMoney(e.amount, e.currency)}
        </div>
      </div>
    </div>
  );
}

/** Every charge in the window, soonest first. */
export function UpcomingList({ charges, today, payday }: { charges: Charge[]; today: string; payday: string | null }) {
  if (charges.length === 0) {
    return <p className="text-[11px] text-zinc-700 uppercase tracking-wider">Nothing to pay in the next 30 days</p>;
  }
  // Payday goes before the first charge that falls on or after it.
  const paydayAt = payday ? charges.findIndex((c) => c.date >= payday) : -1;

  return (
    <div className="space-y-1">
      {charges.map((c, i) => {
        const look = brandLook(c.expense.name, c.expense.category);
        const d = new Date(`${c.date}T00:00:00`);
        return (
          <Fragment key={`${c.expense.id}:${c.date}`}>
            {i === paydayAt && payday && (
              <div className="flex items-center gap-3 py-2">
                <span className="h-px flex-1 bg-cyan-500/30" />
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 whitespace-nowrap">
                  Payday · {dayDate(payday)}
                </span>
                <span className="h-px flex-1 bg-cyan-500/30" />
              </div>
            )}
            <div
              className="flex items-center gap-3 p-3 border bg-black/40"
              style={{ borderColor: i === 0 ? tint(look.color, 0.4) : "#18181b" }}
            >
              <div className="w-9 shrink-0 text-center leading-none">
                <div className="text-lg font-black text-zinc-200">{d.getDate()}</div>
                <div className="text-[9px] uppercase text-zinc-600 mt-1">
                  {d.toLocaleDateString([], { month: "short" })}
                </div>
              </div>
              <BrandIcon look={look} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-zinc-200 leading-snug wrap-break-word">{c.expense.name}</div>
                <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${TONE_TEXT[dueTone(c.date, today)]}`}>
                  {whenLabel(c.date, today)} · {d.toLocaleDateString([], { weekday: "short" })}
                </div>
              </div>
              <div className="text-sm font-black text-zinc-200 whitespace-nowrap">
                {formatMoney(c.expense.amount, c.expense.currency)}
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
