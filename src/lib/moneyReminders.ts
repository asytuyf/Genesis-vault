// Warnings before money leaves the account.
//
// Three days before a charge is enough time to cancel something you no longer
// want. A free trial gets two warnings, the day before and the day it starts
// charging, because that is where money leaks quietly.
//
// Reminders are dated, not timed, so they are held until a civilised hour in
// your own timezone rather than firing at midnight UTC.

import { formatMoney, nextCharge, type Expense, type PaymentCard } from "@/lib/money";

/** Days before a charge to warn. */
const CHARGE_LEAD_DAYS = 3;
/** Nothing is sent before this hour, your time. */
const EARLIEST_HOUR = 9;

export interface MoneyReminder {
  key: string;
  title: string;
  body: string;
  tag: string;
  url: string;
}

/** Today's date and hour where you are, not where the server is. */
export function localNow(timeZone?: string, now: Date = new Date()): { date: string; hour: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) || 0 };
  } catch {
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      hour: now.getHours(),
    };
  }
}

const daysUntil = (date: string, today: string): number =>
  Math.round((Date.parse(`${date}T00:00:00`) - Date.parse(`${today}T00:00:00`)) / 86400000);

/**
 * What to send now. `isSent` keeps each one to a single delivery, keyed by the
 * charge it is about, so moving a date arms a fresh warning.
 */
export function pickDueMoney(
  expenses: Expense[],
  cards: PaymentCard[],
  isSent: (key: string) => boolean,
  timeZone?: string,
  now: Date = new Date()
): MoneyReminder[] {
  const { date: today, hour } = localNow(timeZone, now);
  if (hour < EARLIEST_HOUR) return [];

  const cardLabel = (id?: string) => cards.find((c) => c.id === id)?.label;
  const out: MoneyReminder[] = [];

  for (const e of expenses) {
    if (e.status !== "active") continue;
    const amount = formatMoney(e.amount, e.currency);
    const where = cardLabel(e.cardId);

    // A trial about to turn into a real charge.
    if (e.trialEndsAt) {
      const left = daysUntil(e.trialEndsAt, today);
      if (left === 1 || left === 0) {
        const key = `trial:${e.id}:${e.trialEndsAt}:${left}`;
        if (!isSent(key)) {
          out.push({
            key,
            title: left === 0 ? `${e.name} starts charging today` : `${e.name} trial ends tomorrow`,
            body: `${amount} ${e.cycle === "yearly" ? "a year" : "a month"}${where ? ` from ${where}` : ""}. Cancel now if you do not want it.`,
            tag: `spend-trial-${e.id}`,
            url: "/spend",
          });
        }
      }
    }

    // The ordinary warning before a renewal.
    const due = nextCharge(e, today);
    if (daysUntil(due, today) === CHARGE_LEAD_DAYS) {
      const key = `charge:${e.id}:${due}:${CHARGE_LEAD_DAYS}`;
      if (!isSent(key)) {
        out.push({
          key,
          title: `${e.name} renews in ${CHARGE_LEAD_DAYS} days`,
          body: `${amount}${where ? ` from ${where}` : ""}. Still want it?`,
          tag: `spend-charge-${e.id}`,
          url: "/spend",
        });
      }
    }
  }

  return out;
}
