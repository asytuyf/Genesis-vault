// Recurring money: subscriptions and fixed bills, the cards they come out of,
// and the arithmetic that turns "€8.99 a month" into "€108 a year".
//
// Amounts are whole cents. Money in floating point drifts, and a budget that
// drifts is worse than no budget.
//
// Same operation model as goals and habits: one change touches one record, and
// every operation can be sent again safely.

export type Cycle = "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
export type Status = "active" | "paused" | "cancelled";
export type Verdict = "keep" | "unsure" | "cut";

export const DEFAULT_CURRENCY = "EUR";

export interface PaymentCard {
  id: string;
  /** What you call it: "Revolut", "N26 main", "PayPal". */
  label: string;
  /** Last four digits, for telling two cards apart. Never the full number. */
  last4?: string;
  /** One of CARD_COLOURS. */
  colour: string;
  notes?: string;
}

export interface Expense {
  id: string;
  name: string;
  /** Whole cents, so €8.99 is 899. */
  amount: number;
  /** ISO currency code. Mixed currencies are totalled separately, never converted. */
  currency: string;
  cycle: Cycle;
  /** Days between charges when cycle is "custom". */
  everyDays?: number;
  /** A date a charge falls on, as YYYY-MM-DD. Later charges are counted from it. */
  anchor: string;
  /** Which card or account it leaves from. */
  cardId?: string;
  /** Free text: streaming, phone, rent, insurance. */
  category?: string;
  status: Status;
  /** A free trial that turns into a real charge on this date. */
  trialEndsAt?: string;
  url?: string;
  notes?: string;
  /** When you last decided it was worth keeping. */
  reviewedAt?: string;
  verdict?: Verdict;
  /** When it was cancelled, so the page can total what you stopped paying. */
  cancelledAt?: string;
}

export const CARD_COLOURS = ["cyan", "emerald", "purple", "orange", "pink", "yellow"] as const;

export const CYCLES: { value: Cycle; label: string; perYear: number }[] = [
  { value: "weekly", label: "Weekly", perYear: 52 },
  { value: "monthly", label: "Monthly", perYear: 12 },
  { value: "quarterly", label: "Quarterly", perYear: 4 },
  { value: "yearly", label: "Yearly", perYear: 1 },
  { value: "custom", label: "Every N days", perYear: 0 },
];

// --- operations -------------------------------------------------------------

export interface ExpensePatch {
  name?: string;
  amount?: number;
  currency?: string;
  cycle?: Cycle;
  everyDays?: number;
  anchor?: string;
  /** Empty string clears it. */
  cardId?: string;
  category?: string;
  status?: Status;
  trialEndsAt?: string;
  url?: string;
  notes?: string;
  reviewedAt?: string;
  verdict?: Verdict;
}

export type ExpenseOp =
  | { type: "add"; expense: Expense }
  | { type: "remove"; id: string }
  | { type: "patch"; id: string; set: ExpensePatch }
  | { type: "order"; ids: string[] };

export type CardOp =
  | { type: "add"; card: PaymentCard }
  | { type: "remove"; id: string }
  | { type: "patch"; id: string; set: Partial<Omit<PaymentCard, "id">> }
  | { type: "order"; ids: string[] };

const isStr = (v: unknown): v is string => typeof v === "string";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (v: unknown): v is string => isStr(v) && DATE_RE.test(v);
const isCents = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 100_000_000;

export function isExpenseOp(op: unknown): op is ExpenseOp {
  if (!op || typeof op !== "object") return false;
  const o = op as Record<string, unknown>;
  switch (o.type) {
    case "add": {
      const e = o.expense as Expense | undefined;
      return !!e && typeof e === "object" && isStr(e.id) && isCents(e.amount) && isDate(e.anchor);
    }
    case "remove":
      return isStr(o.id);
    case "patch":
      return isStr(o.id) && !!o.set && typeof o.set === "object";
    case "order":
      return Array.isArray(o.ids) && o.ids.every(isStr);
    default:
      return false;
  }
}

export function isCardOp(op: unknown): op is CardOp {
  if (!op || typeof op !== "object") return false;
  const o = op as Record<string, unknown>;
  switch (o.type) {
    case "add": {
      const c = o.card as PaymentCard | undefined;
      return !!c && typeof c === "object" && isStr(c.id) && isStr(c.label);
    }
    case "remove":
      return isStr(o.id);
    case "patch":
      return isStr(o.id) && !!o.set && typeof o.set === "object";
    case "order":
      return Array.isArray(o.ids) && o.ids.every(isStr);
    default:
      return false;
  }
}

function reorderById<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const seen = new Set<string>();
  const ordered: T[] = [];
  for (const id of ids) {
    const item = byId.get(id);
    if (item && !seen.has(id)) {
      ordered.push(item);
      seen.add(id);
    }
  }
  return [...ordered, ...items.filter((i) => !seen.has(i.id))];
}

function cleanExpense(e: Expense): Expense {
  const cycle: Cycle = CYCLES.some((c) => c.value === e.cycle) ? e.cycle : "monthly";
  return {
    ...e,
    name: String(e.name ?? "").trim().slice(0, 80) || "Untitled",
    amount: isCents(e.amount) ? Math.round(e.amount) : 0,
    currency: isStr(e.currency) && e.currency.length === 3 ? e.currency.toUpperCase() : DEFAULT_CURRENCY,
    cycle,
    everyDays: cycle === "custom" ? Math.max(1, Math.round(Number(e.everyDays) || 30)) : undefined,
    anchor: isDate(e.anchor) ? e.anchor : todayLocal(),
    status: e.status === "paused" || e.status === "cancelled" ? e.status : "active",
  };
}

export function applyExpenseOps(list: Expense[], ops: ExpenseOp[]): Expense[] {
  let next = Array.isArray(list) ? [...list] : [];

  for (const op of ops) {
    if (!isExpenseOp(op)) continue;

    if (op.type === "add") {
      const clean = cleanExpense(op.expense);
      const i = next.findIndex((e) => e.id === clean.id);
      if (i === -1) next.push(clean);
      else next[i] = clean;
      continue;
    }

    if (op.type === "remove") {
      next = next.filter((e) => e.id !== op.id);
      continue;
    }

    if (op.type === "order") {
      next = reorderById(next, op.ids);
      continue;
    }

    const i = next.findIndex((e) => e.id === op.id);
    if (i === -1) continue;

    const set = op.set;
    const e: Expense = { ...next[i] };
    if (isStr(set.name) && set.name.trim()) e.name = set.name.trim().slice(0, 80);
    if (isCents(set.amount)) e.amount = Math.round(set.amount);
    if (isStr(set.currency) && set.currency.length === 3) e.currency = set.currency.toUpperCase();
    if (isStr(set.cycle) && CYCLES.some((c) => c.value === set.cycle)) e.cycle = set.cycle as Cycle;
    if (typeof set.everyDays === "number") e.everyDays = Math.max(1, Math.round(set.everyDays));
    if (isDate(set.anchor)) e.anchor = set.anchor;
    if (isStr(set.cardId)) {
      if (set.cardId) e.cardId = set.cardId;
      else delete e.cardId;
    }
    if (isStr(set.category)) {
      const c = set.category.trim().slice(0, 40);
      if (c) e.category = c;
      else delete e.category;
    }
    if (isStr(set.url)) {
      if (set.url) e.url = set.url.slice(0, 300);
      else delete e.url;
    }
    if (isStr(set.notes)) {
      const n = set.notes.trim().slice(0, 300);
      if (n) e.notes = n;
      else delete e.notes;
    }
    if (isStr(set.trialEndsAt)) {
      if (isDate(set.trialEndsAt)) e.trialEndsAt = set.trialEndsAt;
      else delete e.trialEndsAt;
    }
    if (isStr(set.reviewedAt) && isDate(set.reviewedAt)) e.reviewedAt = set.reviewedAt;
    if (isStr(set.verdict) && ["keep", "unsure", "cut"].includes(set.verdict)) e.verdict = set.verdict as Verdict;
    if (isStr(set.status) && ["active", "paused", "cancelled"].includes(set.status)) {
      e.status = set.status as Status;
      // Stopping something is worth dating, so the page can show what you saved.
      if (e.status === "cancelled") e.cancelledAt = e.cancelledAt ?? todayLocal();
      else delete e.cancelledAt;
    }
    next[i] = e;
  }

  return next;
}

export function applyCardOps(list: PaymentCard[], ops: CardOp[]): PaymentCard[] {
  let next = Array.isArray(list) ? [...list] : [];

  for (const op of ops) {
    if (!isCardOp(op)) continue;

    if (op.type === "add") {
      const card: PaymentCard = {
        ...op.card,
        label: String(op.card.label ?? "").trim().slice(0, 40) || "Card",
        last4: isStr(op.card.last4) ? op.card.last4.replace(/\D/g, "").slice(-4) : undefined,
        colour: (CARD_COLOURS as readonly string[]).includes(op.card.colour) ? op.card.colour : "cyan",
      };
      const i = next.findIndex((c) => c.id === card.id);
      if (i === -1) next.push(card);
      else next[i] = card;
      continue;
    }

    if (op.type === "remove") {
      next = next.filter((c) => c.id !== op.id);
      continue;
    }

    if (op.type === "order") {
      next = reorderById(next, op.ids);
      continue;
    }

    const i = next.findIndex((c) => c.id === op.id);
    if (i === -1) continue;
    const card = { ...next[i] };
    if (isStr(op.set.label) && op.set.label.trim()) card.label = op.set.label.trim().slice(0, 40);
    if (isStr(op.set.last4)) card.last4 = op.set.last4.replace(/\D/g, "").slice(-4) || undefined;
    if (isStr(op.set.colour) && (CARD_COLOURS as readonly string[]).includes(op.set.colour)) card.colour = op.set.colour;
    if (isStr(op.set.notes)) {
      const n = op.set.notes.trim().slice(0, 200);
      if (n) card.notes = n;
      else delete card.notes;
    }
    next[i] = card;
  }

  return next;
}

// --- dates ------------------------------------------------------------------

export const todayLocal = (now: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const daysBetween = (to: string, from: string): number =>
  Math.round((Date.parse(`${to}T00:00:00`) - Date.parse(`${from}T00:00:00`)) / 86400000);

const addDays = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return todayLocal(d);
};

const addMonths = (date: string, months: number): string => {
  const d = new Date(`${date}T00:00:00`);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // A charge anchored on the 31st lands on the last day of a shorter month.
  if (d.getDate() < day) d.setDate(0);
  return todayLocal(d);
};

/** The step from one charge to the next. */
const step = (e: Expense, date: string): string => {
  switch (e.cycle) {
    case "weekly":
      return addDays(date, 7);
    case "quarterly":
      return addMonths(date, 3);
    case "yearly":
      return addMonths(date, 12);
    case "custom":
      return addDays(date, Math.max(1, e.everyDays ?? 30));
    default:
      return addMonths(date, 1);
  }
};

/**
 * The next charge on or after `from`, worked out from the anchor date.
 * Nothing is stored or rewritten as dates pass, so the page is always current
 * even if it has not been opened for a month.
 */
export function nextCharge(e: Expense, from: string = todayLocal()): string {
  if (e.status === "cancelled") return e.anchor;
  let date = e.anchor;
  let guard = 0;
  while (daysBetween(date, from) < 0 && guard++ < 2000) date = step(e, date);
  return date;
}

/** Every charge falling in [from, to], for the upcoming list. */
export function chargesBetween(e: Expense, from: string, to: string): string[] {
  if (e.status !== "active") return [];
  const out: string[] = [];
  let date = nextCharge(e, from);
  let guard = 0;
  while (daysBetween(to, date) >= 0 && guard++ < 400) {
    out.push(date);
    date = step(e, date);
  }
  return out;
}

// --- totals -----------------------------------------------------------------

const PER_YEAR: Record<Exclude<Cycle, "custom">, number> = {
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

/** What one expense costs in a year, in cents. */
export function yearlyCost(e: Expense): number {
  if (e.cycle === "custom") return Math.round((e.amount * 365.25) / Math.max(1, e.everyDays ?? 30));
  return e.amount * PER_YEAR[e.cycle];
}

/** What one expense costs in an average month, in cents. */
export const monthlyCost = (e: Expense): number => Math.round(yearlyCost(e) / 12);

/** Totals per currency, since nothing is converted behind your back. */
export function totalsByCurrency(expenses: Expense[]): { currency: string; monthly: number; yearly: number }[] {
  const map = new Map<string, { monthly: number; yearly: number }>();
  for (const e of expenses) {
    if (e.status !== "active") continue;
    const row = map.get(e.currency) ?? { monthly: 0, yearly: 0 };
    row.monthly += monthlyCost(e);
    row.yearly += yearlyCost(e);
    map.set(e.currency, row);
  }
  return [...map.entries()]
    .map(([currency, v]) => ({ currency, ...v }))
    .sort((a, b) => b.yearly - a.yearly);
}

/** What each card carries per month, heaviest first. */
export function monthlyByCard(
  expenses: Expense[],
  cards: PaymentCard[]
): { card: PaymentCard | null; currency: string; monthly: number; count: number }[] {
  const map = new Map<string, { cardId: string; currency: string; monthly: number; count: number }>();
  for (const e of expenses) {
    if (e.status !== "active") continue;
    const key = `${e.cardId ?? ""}:${e.currency}`;
    const row = map.get(key) ?? { cardId: e.cardId ?? "", currency: e.currency, monthly: 0, count: 0 };
    row.monthly += monthlyCost(e);
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()]
    .map((r) => ({
      card: cards.find((c) => c.id === r.cardId) ?? null,
      currency: r.currency,
      monthly: r.monthly,
      count: r.count,
    }))
    .sort((a, b) => b.monthly - a.monthly);
}

/** Yearly cost of everything cancelled this year: what you stopped paying. */
export function cutThisYear(expenses: Expense[], now: Date = new Date()): { currency: string; yearly: number }[] {
  const year = now.getFullYear();
  const map = new Map<string, number>();
  for (const e of expenses) {
    if (e.status !== "cancelled" || !e.cancelledAt) continue;
    if (new Date(`${e.cancelledAt}T00:00:00`).getFullYear() !== year) continue;
    map.set(e.currency, (map.get(e.currency) ?? 0) + yearlyCost(e));
  }
  return [...map.entries()].map(([currency, yearly]) => ({ currency, yearly }));
}

/** Days after which an untouched subscription is worth a second look. */
export const REVIEW_AFTER_DAYS = 90;

export function needsReview(e: Expense, today: string = todayLocal()): boolean {
  if (e.status !== "active") return false;
  if (e.verdict === "unsure" || e.verdict === "cut") return true;
  if (!e.reviewedAt) return true;
  return daysBetween(today, e.reviewedAt) >= REVIEW_AFTER_DAYS;
}

// --- display ----------------------------------------------------------------

export function formatMoney(cents: number, currency: string = DEFAULT_CURRENCY): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/** "in 3 days", "today", "tomorrow", "4 days ago". */
export function whenLabel(date: string, today: string = todayLocal()): string {
  const days = daysBetween(date, today);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

export const cycleLabel = (e: Expense): string =>
  e.cycle === "custom" ? `every ${e.everyDays ?? 30} days` : CYCLES.find((c) => c.value === e.cycle)!.label.toLowerCase();
