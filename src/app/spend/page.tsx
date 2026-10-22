"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Plus, Pencil, Trash2, Lock, CreditCard, CalendarClock, Pause, Play, Scissors, Check, TrendingDown,
  PiggyBank, HandCoins, type LucideIcon,
} from "lucide-react";
import {
  type Budget, type BudgetOp, type CardOp, type Expense, type ExpenseOp, type ExpensePatch, type KlarnaOp,
  type KlarnaPurchase, type PaymentCard,
  CARD_COLOURS, DEFAULT_CURRENCY, applyBudgetOps, applyCardOps, applyExpenseOps, applyKlarnaOps, chargesBetween,
  cutThisYear, cycleLabel, formatMoney, klarnaOwed, klarnaPayments, monthPlan, monthlyByCard, monthlyCost,
  needsReview, nextCharge, shortDate, todayLocal, whenLabel, yearlyCost,
} from "@/lib/money";
import { useOpSync, type SyncState } from "@/lib/useOpSync";
import { SpendForm } from "@/components/SpendForm";
import { BudgetForm } from "@/components/BudgetForm";
import { KlarnaForm } from "@/components/KlarnaForm";

const SYNC_LABEL: Record<SyncState, { text: string; cls: string }> = {
  synced: { text: "● SYNCED", cls: "text-emerald-600" },
  syncing: { text: "◌ SYNCING", cls: "text-cyan-400 animate-pulse" },
  unsaved: { text: "○ QUEUED", cls: "text-zinc-500" },
  error: { text: "! UNSENT_KEPT_ON_DEVICE", cls: "text-red-400" },
  rejected: { text: "! ADMIN_KEY_REJECTED · LOCK, RE-ENTER, UNLOCK", cls: "text-red-400" },
};

const COLOUR_DOT: Record<string, string> = {
  cyan: "bg-cyan-400",
  emerald: "bg-emerald-400",
  purple: "bg-purple-400",
  orange: "bg-orange-400",
  pink: "bg-pink-400",
  yellow: "bg-yellow-400",
};

const chip =
  "px-2 py-0.5 border border-zinc-800 bg-zinc-900/50 text-zinc-500 text-[10px] font-bold uppercase tracking-wider";

const Stat = ({ value, label, strong }: { value: string; label: string; strong?: boolean }) => (
  <div className="p-5 border border-zinc-900 bg-[#0a0a0a] text-center">
    <div className={`text-2xl md:text-3xl font-black ${strong ? "text-cyan-400" : "text-zinc-300"}`}>{value}</div>
    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-2">{label}</div>
  </div>
);

const lateChip =
  "px-2 py-0.5 border border-red-500/40 bg-red-500/5 text-red-400 text-[10px] font-bold uppercase tracking-wider";

// Four lists sync side by side; the worst of their states is the one to show.
const SYNC_RANK: SyncState[] = ["synced", "unsaved", "syncing", "error", "rejected"];
const worst = (...states: SyncState[]) =>
  states.reduce((a, b) => (SYNC_RANK.indexOf(b) > SYNC_RANK.indexOf(a) ? b : a));

const eur = (cents: number) => formatMoney(cents, DEFAULT_CURRENCY);

const planLabel = (p: KlarnaPurchase) =>
  p.plan === "monthly"
    ? `${p.months ?? 12} months`
    : p.plan === "in3"
      ? "pay in 3"
      : p.plan === "in4"
        ? "pay in 4"
        : "pay in 30 days";

const Heading = ({
  icon: Icon,
  colour = "text-cyan-400",
  title,
  note,
  children,
}: {
  icon: LucideIcon;
  colour?: string;
  title: string;
  note?: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <div className="flex items-center gap-3 mb-4 flex-wrap">
    <Icon size={18} className={colour} />
    <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">{title}</span>
    {note && <span className="text-[10px] text-zinc-700 uppercase">{note}</span>}
    {children}
  </div>
);

const Line = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 py-1">
    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
    <span className="text-sm font-black text-zinc-300">{value}</span>
  </div>
);

/** Stands in for anything private while the page is locked. */
const Hidden = () => (
  <div className="p-8 border border-dashed border-zinc-900 text-center">
    <Lock size={18} className="mx-auto mb-3 text-zinc-800" />
    <p className="text-zinc-700 text-[11px] uppercase tracking-wider">Hidden until unlocked</p>
  </div>
);

export default function SpendPage() {
  const [adminMode, setAdminMode] = useState(false);
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [adding, setAdding] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [newCard, setNewCard] = useState("");
  const [newLast4, setNewLast4] = useState("");
  const [newColour, setNewColour] = useState<string>(CARD_COLOURS[0]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showEnded, setShowEnded] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [klarnaAdding, setKlarnaAdding] = useState(false);
  const [klarnaEditing, setKlarnaEditing] = useState<KlarnaPurchase | null>(null);
  const [showPaidOff, setShowPaidOff] = useState(false);

  const { items: expenses, syncState: expenseSync, queueOps } = useOpSync<Expense, ExpenseOp>({
    endpoint: "/api/money/subs",
    apply: applyExpenseOps,
    resultKey: "expenses",
    password,
    unlocked: adminMode,
    authReads: true,
  });

  const { items: cards, syncState: cardSync, queueOps: queueCardOps } = useOpSync<PaymentCard, CardOp>({
    endpoint: "/api/money/cards",
    apply: applyCardOps,
    resultKey: "cards",
    password,
    unlocked: adminMode,
    authReads: true,
  });

  const { items: budgets, syncState: budgetSync, queueOps: queueBudgetOps } = useOpSync<Budget, BudgetOp>({
    endpoint: "/api/money/budget",
    apply: applyBudgetOps,
    resultKey: "budget",
    password,
    unlocked: adminMode,
    authReads: true,
  });

  const { items: klarna, syncState: klarnaSync, queueOps: queueKlarnaOps } = useOpSync<KlarnaPurchase, KlarnaOp>({
    endpoint: "/api/money/klarna",
    apply: applyKlarnaOps,
    resultKey: "klarna",
    password,
    unlocked: adminMode,
    authReads: true,
  });

  const syncState = worst(expenseSync, cardSync, budgetSync, klarnaSync);
  const budget = budgets[0] as Budget | undefined;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPassword(window.localStorage.getItem("goals_admin_key") || "");
    setAdminMode(window.localStorage.getItem("goals_admin_mode") === "1");

    const keyHandler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") setPassword(detail);
    };
    const modeHandler = (e: Event) => setAdminMode(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener("goals-admin-key", keyHandler as EventListener);
    window.addEventListener("goals-admin-mode", modeHandler as EventListener);
    return () => {
      window.removeEventListener("goals-admin-key", keyHandler as EventListener);
      window.removeEventListener("goals-admin-mode", modeHandler as EventListener);
    };
  }, []);

  const today = todayLocal();
  const active = useMemo(() => expenses.filter((e) => e.status === "active"), [expenses]);
  const paused = useMemo(() => expenses.filter((e) => e.status === "paused"), [expenses]);
  const ended = useMemo(() => expenses.filter((e) => e.status === "cancelled"), [expenses]);

  // Everything leaving the account in the next month, soonest first.
  const upcoming = useMemo(() => {
    const until = new Date();
    until.setDate(until.getDate() + 30);
    const end = todayLocal(until);
    return active
      .flatMap((e) => chargesBetween(e, today, end).map((date) => ({ date, expense: e })))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [active, today]);

  const perCurrency = useMemo(() => {
    const map = new Map<string, { monthly: number; yearly: number }>();
    for (const e of active) {
      const row = map.get(e.currency) ?? { monthly: 0, yearly: 0 };
      row.monthly += monthlyCost(e);
      row.yearly += yearlyCost(e);
      map.set(e.currency, row);
    }
    return [...map.entries()].map(([currency, v]) => ({ currency, ...v })).sort((a, b) => b.yearly - a.yearly);
  }, [active]);

  const next30 = useMemo(() => {
    const map = new Map<string, number>();
    for (const { expense } of upcoming) map.set(expense.currency, (map.get(expense.currency) ?? 0) + expense.amount);
    return [...map.entries()].map(([currency, total]) => ({ currency, total }));
  }, [upcoming]);

  const byCard = useMemo(() => monthlyByCard(active, cards), [active, cards]);
  const cut = useMemo(() => cutThisYear(expenses), [expenses]);
  const review = useMemo(() => active.filter((e) => needsReview(e, today)), [active, today]);
  const trials = useMemo(
    () => active.filter((e) => e.trialEndsAt && Number(new Date(e.trialEndsAt)) >= Number(new Date(today))),
    [active, today]
  );

  // The month as the budget sees it, and the one after, which Klarna bought now eats into.
  const plan = useMemo(() => (budget ? monthPlan(budget, expenses, klarna, today) : null), [budget, expenses, klarna, today]);
  const nextPlan = useMemo(
    () => (budget ? monthPlan(budget, expenses, klarna, today, 1) : null),
    [budget, expenses, klarna, today]
  );
  const foreign = useMemo(() => active.some((e) => e.currency !== DEFAULT_CURRENCY), [active]);

  // Klarna still being paid off, the next payment soonest first.
  const klarnaRows = useMemo(
    () =>
      klarna.map((p) => {
        const payments = klarnaPayments(p);
        return { p, count: payments.length, next: payments.find((pay) => !pay.paid) };
      }),
    [klarna]
  );
  const klarnaOpen = useMemo(
    () => klarnaRows.filter((r) => r.next).sort((a, b) => a.next!.due.localeCompare(b.next!.due)),
    [klarnaRows]
  );
  const klarnaDone = useMemo(() => klarnaRows.filter((r) => !r.next), [klarnaRows]);
  const owed = useMemo(() => klarnaOwed(klarna), [klarna]);

  const save = (expense: Expense) => queueOps([{ type: "add", expense }]);
  const patch = (id: string, set: ExpensePatch) => queueOps([{ type: "patch", id, set }]);

  const money = (cents: number, currency: string) => formatMoney(cents, currency);

  // Locked, the page shows its layout and nothing else: every amount, name and
  // date stays behind the admin key, and the API refuses to send any of it.
  return (
    <main className="relative min-h-screen bg-[#0d0d0d] text-[#f4f4f5] font-mono overflow-x-hidden px-6 pb-6 pt-[86px] md:p-24">
      <div className="fixed inset-x-0 top-0 h-[28px] bg-cyan-500 z-[150] flex items-center overflow-hidden border-b-2 border-black">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>UNDER CONSTRUCTION // MEN AT WORK //</span>)}
        </motion.div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-[28px] bg-cyan-500 z-[150] flex items-center overflow-hidden border-t-2 border-black">
        <motion.div animate={{ x: [-1000, 0] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>UNDER CONSTRUCTION // MEN AT WORK //</span>)}
        </motion.div>
      </div>

      <div className="fixed inset-0 z-0 opacity-[0.03] flex items-center justify-center pointer-events-none">
        <Wallet size={700} strokeWidth={0.5} />
      </div>

      <div className="relative z-10">
        <header className="mb-10 md:mb-14">
          <div className="flex flex-col select-none">
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase leading-[0.8]">SPEND</h1>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-zinc-800 uppercase leading-[0.8]">_CONTROL.</h1>
          </div>
          {adminMode ? (
            <div className="flex items-center gap-3 mt-6 flex-wrap">
              <span className={`text-[10px] font-bold ${SYNC_LABEL[syncState].cls}`}>{SYNC_LABEL[syncState].text}</span>
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-2 px-4 py-2 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-wider hover:bg-cyan-500/10 transition-colors"
              >
                <Plus size={14} /> Subscription
              </button>
              <button
                onClick={() => setKlarnaAdding(true)}
                className="flex items-center gap-2 px-4 py-2 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-wider hover:bg-cyan-500/10 transition-colors"
              >
                <Plus size={14} /> Klarna
              </button>
              <button
                onClick={() => setShowCards(!showCards)}
                className="flex items-center gap-2 px-4 py-2 border border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-wider hover:border-zinc-700 transition-colors"
              >
                <CreditCard size={14} /> Cards
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-6 text-[10px] font-bold text-zinc-600">
              <Lock size={11} /> LOCKED
            </div>
          )}
        </header>

        {!adminMode ? (
          <>
            <section className="mb-10">
              <Heading icon={PiggyBank} title="This month" />
              <Hidden />
            </section>
            <section className="mb-10">
              <Heading icon={HandCoins} colour="text-pink-400" title="Klarna" />
              <Hidden />
            </section>
            <section className="mb-10">
              <Heading icon={Wallet} title="Subscriptions & bills" />
              <Hidden />
            </section>
          </>
        ) : (
          <>
            {/* THIS MONTH */}
            <section className="mb-10">
              <Heading
                icon={PiggyBank}
                title="This month"
                note={plan && `${shortDate(plan.start)} – ${shortDate(plan.end)} · payday ${whenLabel(plan.nextPayday, today)}`}
              >
                {budget && (
                  <button
                    onClick={() => setBudgetOpen(true)}
                    title="Edit budget"
                    className="ml-auto p-1.5 text-zinc-700 hover:text-cyan-400 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </Heading>
              {!plan || !nextPlan ? (
                <button
                  onClick={() => setBudgetOpen(true)}
                  className="group w-full p-8 border border-dashed border-zinc-800 hover:border-cyan-500/40 text-center transition-colors"
                >
                  <PiggyBank size={24} className="mx-auto mb-3 text-zinc-700 group-hover:text-cyan-400 transition-colors" />
                  <p className="text-zinc-500 text-xs font-black uppercase tracking-wider">Set your monthly budget</p>
                </button>
              ) : (
                <div className="p-5 border border-zinc-800 bg-[#0a0a0a]">
                  <Line label="Budget" value={eur(plan.income)} />
                  <Line label="Subscriptions & bills" value={`− ${eur(plan.fixed)}`} />
                  <Line label="Klarna payments" value={`− ${eur(plan.klarnaDue)}`} />
                  <div className="flex items-baseline justify-between gap-4 border-t border-zinc-800 mt-3 pt-3">
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-300">Left to spend</span>
                    <span className={`text-3xl font-black ${plan.left < 0 ? "text-red-400" : "text-cyan-400"}`}>{eur(plan.left)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-3">
                    Next month:{" "}
                    <span className={`font-bold ${nextPlan.left < 0 ? "text-red-400" : "text-zinc-400"}`}>{eur(nextPlan.left)}</span>{" "}
                    left after the subscriptions, bills and Klarna already on it.
                  </p>
                  {foreign && <p className="text-[10px] text-zinc-700 mt-1">Costs not in euro are left out of this.</p>}
                </div>
              )}
            </section>

            {/* KLARNA */}
            <section className="mb-10">
              <Heading icon={HandCoins} colour="text-pink-400" title="Klarna" note={owed > 0 && `${eur(owed)} still to pay`} />
              {plan && budget && (
                <p
                  className={`text-[11px] mb-3 ${
                    budget.klarnaLimit > 0 && plan.klarnaUsed > budget.klarnaLimit ? "text-red-400" : "text-zinc-500"
                  }`}
                >
                  Bought this month: <span className="font-black">{eur(plan.klarnaUsed)}</span>
                  {budget.klarnaLimit > 0 && ` of your ${eur(budget.klarnaLimit)} limit`}
                </p>
              )}
              {klarnaOpen.length === 0 ? (
                <div className="p-8 border border-dashed border-zinc-900 text-center text-zinc-700 text-xs uppercase tracking-wider">
                  Nothing owed to Klarna
                </div>
              ) : (
                <div className="space-y-2">
                  {klarnaOpen.map(({ p, count, next }) => {
                    const late = next!.due < today;
                    return (
                      <div key={p.id} className="p-4 border border-zinc-800 bg-[#0a0a0a]">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-base font-bold text-white flex-1 min-w-[8rem] truncate">{p.name}</span>
                          <span className="text-base font-black text-pink-400">{eur(p.amount)}</span>
                          <span className="text-[10px] text-zinc-600 uppercase">{planLabel(p)}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <span className={late ? lateChip : chip}>
                            {eur(next!.amount)} {late ? "was due" : "due"} {whenLabel(next!.due, today)}
                          </span>
                          {count > 1 && (
                            <span className={chip}>
                              {p.paid} of {count} paid
                            </span>
                          )}

                          <span className="ml-auto flex items-center gap-1">
                            <button
                              onClick={() => queueKlarnaOps([{ type: "patch", id: p.id, set: { paid: p.paid + 1 } }])}
                              className={`${chip} hover:border-emerald-500/40 hover:text-emerald-400 inline-flex items-center gap-1`}
                            >
                              <Check size={10} /> Paid
                            </button>
                            <button onClick={() => setKlarnaEditing(p)} title="Edit" className="p-1.5 text-zinc-700 hover:text-cyan-400 transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() =>
                                confirmId === `k${p.id}` ? queueKlarnaOps([{ type: "remove", id: p.id }]) : setConfirmId(`k${p.id}`)
                              }
                              onBlur={() => setConfirmId((id) => (id === `k${p.id}` ? null : id))}
                              title={confirmId === `k${p.id}` ? "Click again to delete" : "Delete"}
                              className={`p-1.5 transition-colors ${confirmId === `k${p.id}` ? "text-red-400" : "text-zinc-800 hover:text-red-400"}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {klarnaDone.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowPaidOff(!showPaidOff)}
                    className="text-[10px] font-black uppercase tracking-wider text-zinc-700 hover:text-zinc-500 transition-colors"
                  >
                    {showPaidOff ? "Hide" : "Show"} {klarnaDone.length} paid off
                  </button>
                  {showPaidOff && (
                    <div className="mt-3 space-y-1">
                      {klarnaDone.map(({ p }) => (
                        <div key={p.id} className="flex items-center gap-3 p-2.5 border border-zinc-900 bg-black/30">
                          <span className="text-sm text-zinc-600 line-through flex-1 truncate">{p.name}</span>
                          <span className="text-[11px] text-zinc-600">{eur(p.amount)}</span>
                          <button onClick={() => setKlarnaEditing(p)} title="Edit" className="p-1 text-zinc-800 hover:text-cyan-400 transition-colors">
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => queueKlarnaOps([{ type: "remove", id: p.id }])}
                            title="Forget it entirely"
                            className="p-1 text-zinc-800 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* WHAT IT COSTS */}
            <section className="mb-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {perCurrency.length === 0 ? (
                <Stat value="—" label="Per month" />
              ) : (
                perCurrency.map((c) => <Stat key={c.currency} value={money(c.monthly, c.currency)} label="Per month" strong />)
              )}
              {perCurrency.map((c) => (
                <Stat key={`y-${c.currency}`} value={money(c.yearly, c.currency)} label="Per year" />
              ))}
              {next30.length === 0 ? (
                <Stat value="—" label="Next 30 days" />
              ) : (
                next30.map((c) => <Stat key={`n-${c.currency}`} value={money(c.total, c.currency)} label="Next 30 days" />)
              )}
              {cut.map((c) => (
                <Stat key={`c-${c.currency}`} value={money(c.yearly, c.currency)} label="Cut this year" />
              ))}
            </section>

            {/* TRIALS ABOUT TO BITE */}
            {trials.length > 0 && (
              <section className="mb-10">
                <Heading icon={CalendarClock} colour="text-yellow-400" title="Trials ending" />
                <div className="space-y-2">
                  {trials.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 p-3 border border-yellow-500/30 bg-yellow-500/5">
                      <span className="text-sm font-bold text-white flex-1 truncate">{e.name}</span>
                      <span className="text-[11px] text-yellow-400 font-bold">
                        starts charging {whenLabel(e.trialEndsAt!, today)}
                      </span>
                      <span className="text-xs font-black text-zinc-300">{money(e.amount, e.currency)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* NEXT 30 DAYS */}
            <section className="mb-10">
              <Heading icon={CalendarClock} title="Leaving the account" note="next 30 days" />
              {upcoming.length === 0 ? (
                <div className="p-8 border border-dashed border-zinc-900 text-center text-zinc-700 text-xs uppercase tracking-wider">
                  Nothing due in the next month
                </div>
              ) : (
                <div className="space-y-1">
                  {upcoming.slice(0, 12).map(({ date, expense }, i) => {
                    const card = cards.find((c) => c.id === expense.cardId);
                    return (
                      <div key={`${expense.id}-${date}-${i}`} className="flex items-center gap-3 p-3 border border-zinc-900 bg-black/40">
                        <span className="text-[10px] font-mono text-zinc-600 w-20 shrink-0">{whenLabel(date, today)}</span>
                        <span className="text-sm text-zinc-300 flex-1 truncate">{expense.name}</span>
                        {card && (
                          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-zinc-600">
                            <span className={`h-2 w-2 rounded-full ${COLOUR_DOT[card.colour] ?? "bg-zinc-600"}`} />
                            {card.label}
                          </span>
                        )}
                        <span className="text-sm font-black text-cyan-400 shrink-0">{money(expense.amount, expense.currency)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* BY CARD */}
            {byCard.length > 0 && (
              <section className="mb-10">
                <Heading icon={CreditCard} title="Per card, per month" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {byCard.map((row, i) => (
                    <div key={i} className="p-4 border border-zinc-900 bg-[#0a0a0a]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${row.card ? COLOUR_DOT[row.card.colour] ?? "bg-zinc-600" : "bg-zinc-700"}`} />
                        <span className="text-sm font-bold text-white truncate">{row.card?.label ?? "No card set"}</span>
                        {row.card?.last4 && <span className="text-[10px] text-zinc-600 font-mono">·{row.card.last4}</span>}
                      </div>
                      <div className="text-xl font-black text-cyan-400">{money(row.monthly, row.currency)}</div>
                      <div className="text-[10px] text-zinc-700 uppercase tracking-wider mt-1">
                        {row.count} {row.count === 1 ? "thing" : "things"}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* WORTH IT */}
            {review.length > 0 && (
              <section className="mb-10">
                <Heading icon={TrendingDown} title="Worth it?">
                  <span className="text-[10px] text-zinc-700 normal-case">not looked at in a while</span>
                </Heading>
                <div className="space-y-2">
                  {review.map((e) => (
                    <div key={e.id} className="flex flex-wrap items-center gap-3 p-3 border border-zinc-800 bg-zinc-900/30">
                      <span className="text-sm font-bold text-white flex-1 min-w-[8rem] truncate">{e.name}</span>
                      <span className="text-[11px] text-zinc-500">
                        {money(yearlyCost(e), e.currency)} <span className="text-zinc-700">a year</span>
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => patch(e.id, { reviewedAt: today, verdict: "keep" })}
                          className={`${chip} hover:border-emerald-500/40 hover:text-emerald-400 inline-flex items-center gap-1`}
                        >
                          <Check size={10} /> Keep
                        </button>
                        <button
                          onClick={() => patch(e.id, { status: "cancelled", reviewedAt: today, verdict: "cut" })}
                          className={`${chip} hover:border-red-500/40 hover:text-red-400 inline-flex items-center gap-1`}
                        >
                          <Scissors size={10} /> Cut it
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SUBSCRIPTIONS AND BILLS */}
            <section className="mb-10">
              <Heading icon={Wallet} title="Subscriptions & bills" />

              {active.length === 0 && paused.length === 0 ? (
                <div className="p-10 border border-dashed border-zinc-900 text-center">
                  <Wallet size={28} className="mx-auto mb-3 text-zinc-800" />
                  <p className="text-zinc-600 text-xs uppercase tracking-wider">Nothing here yet</p>
                  <p className="text-zinc-700 text-[11px] mt-2">Add the first subscription or bill above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...active, ...paused].map((e) => {
                    const card = cards.find((c) => c.id === e.cardId);
                    const due = nextCharge(e, today);
                    return (
                      <div
                        key={e.id}
                        className={`p-4 border bg-[#0a0a0a] ${e.status === "paused" ? "border-zinc-900 opacity-60" : "border-zinc-800"}`}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-base font-bold text-white flex-1 min-w-[8rem] truncate">{e.name}</span>
                          <span className="text-base font-black text-cyan-400">{money(e.amount, e.currency)}</span>
                          <span className="text-[10px] text-zinc-600 uppercase">{cycleLabel(e)}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <span className={chip}>{money(yearlyCost(e), e.currency)} a year</span>
                          {e.status === "active" && <span className={chip}>due {whenLabel(due, today)}</span>}
                          {e.status === "paused" && <span className={chip}>paused</span>}
                          {card && (
                            <span className={`${chip} inline-flex items-center gap-1.5`}>
                              <span className={`h-2 w-2 rounded-full ${COLOUR_DOT[card.colour] ?? "bg-zinc-600"}`} />
                              {card.label}
                            </span>
                          )}
                          {e.category && <span className={chip}>{e.category}</span>}

                          <span className="ml-auto flex items-center gap-1">
                            <button onClick={() => setEditing(e)} title="Edit" className="p-1.5 text-zinc-700 hover:text-cyan-400 transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => patch(e.id, { status: e.status === "paused" ? "active" : "paused" })}
                              title={e.status === "paused" ? "Resume" : "Pause"}
                              className="p-1.5 text-zinc-700 hover:text-yellow-400 transition-colors"
                            >
                              {e.status === "paused" ? <Play size={14} /> : <Pause size={14} />}
                            </button>
                            <button
                              onClick={() => patch(e.id, { status: "cancelled" })}
                              title="Cancelled it"
                              className="p-1.5 text-zinc-700 hover:text-emerald-400 transition-colors"
                            >
                              <Scissors size={14} />
                            </button>
                            <button
                              onClick={() => (confirmId === e.id ? queueOps([{ type: "remove", id: e.id }]) : setConfirmId(e.id))}
                              onBlur={() => setConfirmId((id) => (id === e.id ? null : id))}
                              title={confirmId === e.id ? "Click again to delete" : "Delete"}
                              className={`p-1.5 transition-colors ${confirmId === e.id ? "text-red-400" : "text-zinc-800 hover:text-red-400"}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </span>
                        </div>

                        {e.notes && <p className="text-[11px] text-zinc-600 mt-2">{e.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              {ended.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowEnded(!showEnded)}
                    className="text-[10px] font-black uppercase tracking-wider text-zinc-700 hover:text-zinc-500 transition-colors"
                  >
                    {showEnded ? "Hide" : "Show"} {ended.length} cancelled
                  </button>
                  {showEnded && (
                    <div className="mt-3 space-y-1">
                      {ended.map((e) => (
                        <div key={e.id} className="flex items-center gap-3 p-2.5 border border-zinc-900 bg-black/30">
                          <span className="text-sm text-zinc-600 line-through flex-1 truncate">{e.name}</span>
                          <span className="text-[11px] text-emerald-600">saved {money(yearlyCost(e), e.currency)} a year</span>
                          <button
                            onClick={() => patch(e.id, { status: "active" })}
                            className={`${chip} hover:border-cyan-500/40 hover:text-cyan-400`}
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => queueOps([{ type: "remove", id: e.id }])}
                            title="Forget it entirely"
                            className="p-1 text-zinc-800 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* CARDS */}
            <AnimatePresence>
              {showCards && (
                <motion.section
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-10 overflow-hidden"
                >
                  <div className="p-4 border border-zinc-800 bg-black/60 space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Cards and accounts</div>

                    {cards.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 p-2.5 border border-zinc-900 bg-black/40">
                        <span className={`h-2.5 w-2.5 rounded-full ${COLOUR_DOT[c.colour] ?? "bg-zinc-600"}`} />
                        <span className="text-sm text-zinc-300 flex-1 truncate">{c.label}</span>
                        {c.last4 && <span className="text-[10px] text-zinc-600 font-mono">·{c.last4}</span>}
                        <button
                          onClick={() => queueCardOps([{ type: "remove", id: c.id }])}
                          title="Remove card"
                          className="p-1 text-zinc-800 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}

                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        placeholder="Card or account name"
                        value={newCard}
                        onChange={(e) => setNewCard(e.target.value)}
                        className="flex-1 min-w-[10rem] bg-black border border-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-500/60 placeholder:text-zinc-700"
                      />
                      <input
                        placeholder="Last 4"
                        inputMode="numeric"
                        maxLength={4}
                        value={newLast4}
                        onChange={(e) => setNewLast4(e.target.value.replace(/\D/g, ""))}
                        className="w-20 bg-black border border-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-500/60 placeholder:text-zinc-700 font-mono"
                      />
                      <div className="flex gap-1.5">
                        {CARD_COLOURS.map((colour) => (
                          <button
                            key={colour}
                            onClick={() => setNewColour(colour)}
                            aria-label={colour}
                            className={`h-6 w-6 rounded-full ${COLOUR_DOT[colour]} transition-all ${
                              newColour === colour ? "ring-2 ring-white ring-offset-2 ring-offset-black" : "opacity-50 hover:opacity-100"
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          if (!newCard.trim()) return;
                          queueCardOps([
                            {
                              type: "add",
                              card: { id: Date.now().toString(), label: newCard.trim(), last4: newLast4 || undefined, colour: newColour },
                            },
                          ]);
                          setNewCard("");
                          setNewLast4("");
                        }}
                        className="px-4 py-2 border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase tracking-wider hover:bg-cyan-500/10 transition-colors"
                      >
                        Add card
                      </button>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      <AnimatePresence>
        {adminMode && (adding || editing) && (
          <SpendForm
            expense={editing ?? undefined}
            cards={cards}
            onSave={save}
            onClose={() => {
              setAdding(false);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adminMode && budgetOpen && (
          <BudgetForm
            budget={budget}
            onSave={(set) => queueBudgetOps([{ type: "set", set }])}
            onClose={() => setBudgetOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adminMode && (klarnaAdding || klarnaEditing) && (
          <KlarnaForm
            purchase={klarnaEditing ?? undefined}
            onSave={(purchase) => queueKlarnaOps([{ type: "add", purchase }])}
            onClose={() => {
              setKlarnaAdding(false);
              setKlarnaEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
