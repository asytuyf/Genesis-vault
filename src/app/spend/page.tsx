"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Plus, Pencil, Trash2, Lock, PiggyBank, Repeat, CalendarClock, ChevronDown, type LucideIcon } from "lucide-react";
import {
  type Budget, type BudgetOp, type Expense, type ExpenseOp, type ExpensePatch, type KlarnaPayment, type KlarnaPaymentOp,
  type Spend, type SpendOp,
  DEFAULT_CURRENCY, applyBudgetOps, applyExpenseOps, applyKlarnaPaymentOps, applySpendOps, budgetPeriod, formatMoney,
  klarnaMonths, monthPlan, nextPayment, shortDate, spendingBetween, todayLocal, totalsByCurrency, upcomingCharges,
  whenLabel, withTicked, yearlyCost,
} from "@/lib/money";
import { useOpSync, type SyncState } from "@/lib/useOpSync";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { NextPayment, UpcomingList } from "@/components/UpcomingPayments";
import { KlarnaPanel } from "@/components/KlarnaPanel";
import { KlarnaPaymentForm, type MonthChoice } from "@/components/KlarnaPaymentForm";
import { BudgetForm } from "@/components/BudgetForm";
import { ExpenseForm } from "@/components/ExpenseForm";

const SYNC_LABEL: Record<SyncState, { text: string; cls: string }> = {
  synced: { text: "● SYNCED", cls: "text-emerald-600" },
  syncing: { text: "◌ SYNCING", cls: "text-cyan-400 animate-pulse" },
  unsaved: { text: "○ QUEUED", cls: "text-zinc-500" },
  error: { text: "! UNSENT_KEPT_ON_DEVICE", cls: "text-red-400" },
  rejected: { text: "! ADMIN_KEY_REJECTED · LOCK, RE-ENTER, UNLOCK", cls: "text-red-400" },
};

// Four lists sync side by side; the worst of their states is the one to show.
const SYNC_RANK: SyncState[] = ["synced", "unsaved", "syncing", "error", "rejected"];
const worst = (...states: SyncState[]) =>
  states.reduce((a, b) => (SYNC_RANK.indexOf(b) > SYNC_RANK.indexOf(a) ? b : a));

/** Expenses shown before "show all". */
const RECENT = 6;
/** How far ahead "to be paid" looks. */
const AHEAD_DAYS = 30;

const addButton =
  "w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-wider hover:bg-cyan-500/10 transition-colors";

/** A new record's id: the time it was made, like everywhere else on the site. */
const newId = () => Date.now().toString();

const eur = (cents: number) => formatMoney(cents, DEFAULT_CURRENCY);
const money = (cents: number, currency: string) => formatMoney(cents, currency);
const sumByCurrency = (rows: { amount: number; currency: string }[]) => {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.currency, (map.get(r.currency) ?? 0) + r.amount);
  return [...map.entries()].map(([currency, amount]) => money(amount, currency)).join(" + ");
};

const Heading = ({
  icon: Icon,
  title,
  note,
  children,
}: {
  icon: LucideIcon;
  title: string;
  note?: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <div className="flex items-center gap-x-3 gap-y-1 mb-4 flex-wrap">
    <Icon size={18} className="text-cyan-400 shrink-0" />
    <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">{title}</span>
    {note && <span className="text-[10px] text-zinc-600 uppercase wrap-break-word min-w-0">{note}</span>}
    {children}
  </div>
);

const Line = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 py-1">
    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 min-w-0">{label}</span>
    <span className="text-sm font-black text-zinc-300 whitespace-nowrap">{value}</span>
  </div>
);

export default function SpendPage() {
  const [adminMode, setAdminMode] = useState(false);
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [adding, setAdding] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [spendEditing, setSpendEditing] = useState<Spend | null>(null);
  const [spendAdding, setSpendAdding] = useState(false);
  const [spendDefaults, setSpendDefaults] = useState<{ klarna?: boolean; date?: string; where?: string } | undefined>();
  const [paymentEditing, setPaymentEditing] = useState<KlarnaPayment | null>(null);
  const [paymentAdding, setPaymentAdding] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showAllSpending, setShowAllSpending] = useState(false);
  const [showEnded, setShowEnded] = useState(false);

  const { items: expenses, syncState: expenseSync, queueOps } = useOpSync<Expense, ExpenseOp>({
    endpoint: "/api/money/subs",
    apply: applyExpenseOps,
    resultKey: "expenses",
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

  const { items: spending, syncState: spendSync, queueOps: queueSpendOps } = useOpSync<Spend, SpendOp>({
    endpoint: "/api/money/spending",
    apply: applySpendOps,
    resultKey: "spending",
    password,
    unlocked: adminMode,
    authReads: true,
  });

  const { items: payments, syncState: paymentSync, queueOps: queuePaymentOps } = useOpSync<KlarnaPayment, KlarnaPaymentOp>({
    endpoint: "/api/money/klarna",
    apply: applyKlarnaPaymentOps,
    resultKey: "payments",
    password,
    unlocked: adminMode,
    authReads: true,
  });

  const syncState = worst(expenseSync, budgetSync, spendSync, paymentSync);
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
  // Paying now, soonest charge first.
  const active = useMemo(
    () =>
      expenses
        .filter((e) => e.status === "active")
        .map((e) => ({ e, next: nextPayment(e, today) ?? "9999-12-31" }))
        .sort((a, b) => a.next.localeCompare(b.next) || a.e.name.localeCompare(b.e.name))
        .map((x) => x.e),
    [expenses, today]
  );
  const inactive = useMemo(() => expenses.filter((e) => e.status === "paused"), [expenses]);
  const ended = useMemo(() => expenses.filter((e) => e.status === "cancelled"), [expenses]);
  const totals = useMemo(() => totalsByCurrency(active), [active]);
  const upcoming = useMemo(() => upcomingCharges(active, today, AHEAD_DAYS), [active, today]);

  const plan = useMemo(
    () => (budget ? monthPlan(budget, expenses, spending, today, payments) : null),
    [budget, expenses, spending, today, payments]
  );
  // Without a budget there is no payday yet, so a month is a calendar month.
  const payday = budget?.payday ?? 1;
  const klarna = useMemo(() => klarnaMonths(spending, payments, payday, today), [spending, payments, payday, today]);
  const klarnaPayments = useMemo(
    () => withTicked(spending, payments).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [spending, payments]
  );
  // Months a payment can pay back, oldest first, with what is left on each.
  const monthChoices: MonthChoice[] = [
    ...klarna.earlier.map((m) => ({ start: m.start, label: `${shortDate(m.start)} – ${shortDate(m.end)}`, left: m.left })),
    { start: klarna.last.start, label: "Last month", left: klarna.last.left },
    { start: klarna.current.start, label: "This month", left: klarna.current.left },
  ];
  const monthOf = (date: string) => budgetPeriod(payday, date).start;
  const forLabel = (p: KlarnaPayment) => {
    const start = monthOf(p.for);
    if (start === klarna.current.start) return "this month";
    if (start === klarna.last.start) return "last month";
    return `${shortDate(start)} – ${shortDate(budgetPeriod(payday, p.for).end)}`;
  };
  // A new payment goes to the oldest month still owing, else this month.
  const firstOwing = monthChoices.find((m) => m.left > 0)?.start ?? klarna.current.start;
  const period = useMemo(() => (plan ? { start: plan.start, end: plan.end } : budgetPeriod(1, today)), [plan, today]);
  const monthSpending = useMemo(() => spendingBetween(spending, period.start, period.end), [period, spending]);
  const shownSpending = showAllSpending ? monthSpending : monthSpending.slice(0, RECENT);
  const foreign = useMemo(() => active.some((e) => e.currency !== DEFAULT_CURRENCY), [active]);
  // The last one-off payment this month for each subscription that is not paid regularly.
  const paidOnce = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of monthSpending) if (s.sub && !map.has(s.sub)) map.set(s.sub, s.date);
    return map;
  }, [monthSpending]);

  const save = (expense: Expense) => queueOps([{ type: "add", expense }]);
  const patch = (id: string, set: ExpensePatch) => queueOps([{ type: "patch", id, set }]);
  const saveSpending = (list: Spend[]) => queueSpendOps(list.map((spend) => ({ type: "add" as const, spend })));
  const savePayment = (payment: KlarnaPayment) => {
    // A Klarna expense once ticked off as paid becomes a payment of its own.
    if (payment.id.startsWith("ticked:")) {
      const ticked = spending.find((s) => `ticked:${s.id}` === payment.id);
      if (ticked) {
        const rest = { ...ticked };
        delete rest.paid;
        saveSpending([rest]);
      }
      queuePaymentOps([{ type: "add", payment: { ...payment, id: newId() } }]);
      return;
    }
    queuePaymentOps([{ type: "add", payment }]);
  };
  const deletePayment = (payment: KlarnaPayment) => {
    if (payment.id.startsWith("ticked:")) {
      const ticked = spending.find((s) => `ticked:${s.id}` === payment.id);
      if (ticked) {
        const rest = { ...ticked };
        delete rest.paid;
        saveSpending([rest]);
      }
      return;
    }
    queuePaymentOps([{ type: "remove", id: payment.id }]);
  };
  const payOnce = (e: Expense) =>
    saveSpending([{ id: newId(), amount: e.amount, where: e.name, date: today, sub: e.id }]);

  const used = plan && plan.income > 0 ? Math.min(100, Math.max(0, ((plan.income - plan.left) / plan.income) * 100)) : 0;

  return (
    <main className="relative min-h-screen bg-[#0d0d0d] text-[#f4f4f5] font-mono overflow-x-hidden px-4 sm:px-6 pt-[86px] pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:p-24">
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

      <div className="relative z-10 max-w-5xl">
        <header className="mb-8 md:mb-12">
          <div className="flex flex-col select-none">
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase leading-[0.8]">SPEND</h1>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-zinc-800 uppercase leading-[0.8]">_CONTROL.</h1>
          </div>
          {adminMode && <div className={`mt-6 text-[10px] font-bold ${SYNC_LABEL[syncState].cls}`}>{SYNC_LABEL[syncState].text}</div>}
        </header>

        {/* Locked, nothing private is on the page at all, and the API refuses to send any of it. */}
        {!adminMode ? (
          <div className="p-10 border border-dashed border-zinc-800 text-center max-w-md">
            <Lock size={22} className="mx-auto mb-4 text-zinc-600" />
            <p className="text-sm font-black uppercase tracking-wider text-zinc-400">Locked</p>
            <p className="text-[11px] text-zinc-600 mt-2 leading-relaxed">Unlock with your admin key in the menu to see your expenses.</p>
          </div>
        ) : (
          <>
            {/* THE CLOSEST PAYMENT */}
            {upcoming[0] && (
              <section className="mb-10">
                <NextPayment charge={upcoming[0]} today={today} />
              </section>
            )}

            {/* MONTHLY BUDGET */}
            <section className="mb-12">
              <Heading
                icon={PiggyBank}
                title="Monthly budget"
                note={plan && `${shortDate(plan.start)} – ${shortDate(plan.end)} · payday ${whenLabel(plan.nextPayday, today)}`}
              >
                {budget && (
                  <button
                    onClick={() => setBudgetOpen(true)}
                    aria-label="Edit budget"
                    className="ml-auto p-1.5 text-zinc-600 hover:text-cyan-400 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </Heading>

              {!plan || !budget ? (
                <button
                  onClick={() => setBudgetOpen(true)}
                  className="group w-full p-8 border border-dashed border-zinc-800 hover:border-cyan-500/40 text-center transition-colors"
                >
                  <PiggyBank size={24} className="mx-auto mb-3 text-zinc-700 group-hover:text-cyan-400 transition-colors" />
                  <p className="text-zinc-500 text-xs font-black uppercase tracking-wider">Set your monthly budget</p>
                </button>
              ) : (
                <div className="p-4 sm:p-5 border border-zinc-800 bg-[#0a0a0a]">
                  <Line label="Budget" value={eur(plan.income)} />
                  <Line label="Subscriptions" value={`− ${eur(plan.subscriptions)}`} />
                  {plan.klarnaBack > 0 && <Line label="Klarna from last month" value={`− ${eur(plan.klarnaBack)}`} />}
                  {plan.klarnaEarly > 0 && <Line label="Klarna paid early" value={`− ${eur(plan.klarnaEarly)}`} />}
                  <Line label="Spent" value={`− ${eur(plan.spent)}`} />
                  <div className="flex items-baseline justify-between gap-4 border-t border-zinc-800 mt-3 pt-3">
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-300">Left</span>
                    <span className={`text-3xl font-black whitespace-nowrap ${plan.left < 0 ? "text-red-400" : "text-cyan-400"}`}>
                      {eur(plan.left)}
                    </span>
                  </div>
                  <div className="h-1.5 mt-3 bg-zinc-900 overflow-hidden" title={`${Math.round(used)}% of the budget gone`}>
                    <div className={`h-full ${plan.left < 0 ? "bg-red-400" : "bg-cyan-400"}`} style={{ width: `${used}%` }} />
                  </div>
                  {foreign && <p className="text-[10px] text-zinc-700 mt-2">Subscriptions not in euro are left out of this.</p>}
                </div>
              )}

              <KlarnaPanel
                current={klarna.current}
                last={klarna.last}
                earlier={klarna.earlier}
                payments={klarnaPayments}
                forLabel={forLabel}
                limit={budget ? budget.klarnaLimit : null}
                today={today}
                onAddPayment={() => setPaymentAdding(true)}
                onEditPayment={setPaymentEditing}
                onDeletePayment={deletePayment}
                onAddPurchase={(date) => {
                  setSpendDefaults({ klarna: true, date, where: "Klarna" });
                  setSpendAdding(true);
                }}
                onEditPurchase={setSpendEditing}
              />

              <div className="mt-6">
                <button onClick={() => setSpendAdding(true)} className={addButton}>
                  <Plus size={14} /> Add expense
                </button>
              </div>

              {monthSpending.length === 0 ? (
                <p className="mt-4 text-[11px] text-zinc-700 uppercase tracking-wider">No expenses yet this month</p>
              ) : (
                <div className="mt-4 space-y-1">
                  {shownSpending.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 border border-zinc-900 bg-black/40">
                      <button
                        onClick={() => setSpendEditing(s)}
                        aria-label={`Edit ${s.where}`}
                        className="min-w-0 flex-1 text-left group"
                      >
                        <span className="block text-sm text-zinc-300 group-hover:text-white leading-snug wrap-break-word transition-colors">
                          {s.where}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">
                          {shortDate(s.date)}
                          {s.klarna && (
                            <span className="px-1.5 border border-pink-500/30 text-pink-400 font-black">
                              Klarna
                            </span>
                          )}
                        </span>
                      </button>
                      <span className="text-sm font-black text-zinc-200 whitespace-nowrap">{eur(s.amount)}</span>
                      <button
                        onClick={() =>
                          confirmId === `s${s.id}` ? queueSpendOps([{ type: "remove", id: s.id }]) : setConfirmId(`s${s.id}`)
                        }
                        onBlur={() => setConfirmId((id) => (id === `s${s.id}` ? null : id))}
                        aria-label={confirmId === `s${s.id}` ? "Tap again to delete" : "Delete"}
                        className={`shrink-0 p-1.5 transition-colors ${confirmId === `s${s.id}` ? "text-red-400" : "text-zinc-700 hover:text-red-400"}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {monthSpending.length > RECENT && (
                    <button
                      onClick={() => setShowAllSpending(!showAllSpending)}
                      className="inline-flex items-center gap-1.5 pt-2 text-[10px] font-black uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      <ChevronDown size={12} className={`transition-transform ${showAllSpending ? "rotate-180" : ""}`} />
                      {showAllSpending ? "Show fewer" : `Show all ${monthSpending.length}`}
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* TO BE PAID */}
            <section className="mb-12">
              <Heading
                icon={CalendarClock}
                title="To be paid"
                note={upcoming.length > 0 && `${sumByCurrency(upcoming.map((c) => c.expense))} in the next ${AHEAD_DAYS} days`}
              />
              <UpcomingList charges={upcoming} today={today} payday={plan?.nextPayday ?? null} />
            </section>

            {/* SUBSCRIPTIONS */}
            <section className="mb-12">
              <Heading
                icon={Repeat}
                title="Subscriptions"
                note={
                  totals.length > 0 &&
                  totals.map((t) => `${money(t.monthly, t.currency)} a month · ${money(t.yearly, t.currency)} a year`).join(" + ")
                }
              />

              <div className="mb-4">
                <button onClick={() => setAdding(true)} className={addButton}>
                  <Plus size={14} /> Add subscription
                </button>
              </div>

              {active.length === 0 && inactive.length === 0 ? (
                <p className="text-[11px] text-zinc-700 uppercase tracking-wider">No subscriptions yet</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {active.map((e) => (
                    <SubscriptionCard
                      key={e.id}
                      expense={e}
                      today={today}
                      onEdit={() => setEditing(e)}
                      onPaying={(p) => patch(e.id, { status: p ? "active" : "paused" })}
                      onCancelled={() => patch(e.id, { status: "cancelled" })}
                      onDelete={() => queueOps([{ type: "remove", id: e.id }])}
                      onPayOnce={() => payOnce(e)}
                    />
                  ))}
                </div>
              )}

              {inactive.length > 0 && (
                <>
                  <div className="mt-8 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                    Not paying right now · {inactive.length}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {inactive.map((e) => (
                      <SubscriptionCard
                        key={e.id}
                        expense={e}
                        today={today}
                        paidOnce={paidOnce.get(e.id)}
                        onEdit={() => setEditing(e)}
                        onPaying={(p) => patch(e.id, { status: p ? "active" : "paused" })}
                        onCancelled={() => patch(e.id, { status: "cancelled" })}
                        onDelete={() => queueOps([{ type: "remove", id: e.id }])}
                        onPayOnce={() => payOnce(e)}
                      />
                    ))}
                  </div>
                </>
              )}

              {ended.length > 0 && (
                <div className="mt-8">
                  <button
                    onClick={() => setShowEnded(!showEnded)}
                    className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    <ChevronDown size={12} className={`transition-transform ${showEnded ? "rotate-180" : ""}`} />
                    {ended.length} cancelled
                  </button>
                  {showEnded && (
                    <div className="mt-3 space-y-1">
                      {ended.map((e) => (
                        <div key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-2.5 border border-zinc-900 bg-black/30">
                          <span className="text-sm text-zinc-500 line-through flex-1 min-w-0 wrap-break-word">{e.name}</span>
                          <span className="text-[11px] text-emerald-600 whitespace-nowrap">saved {money(yearlyCost(e), e.currency)} a year</span>
                          <span className="flex items-center gap-1 ml-auto">
                            <button
                              onClick={() => patch(e.id, { status: "active" })}
                              className="px-2 py-1 border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-wider hover:border-cyan-500/40 hover:text-cyan-400 transition-colors"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => queueOps([{ type: "remove", id: e.id }])}
                              aria-label="Forget it entirely"
                              className="p-1.5 text-zinc-700 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <AnimatePresence>
        {adminMode && (adding || editing) && (
          <SubscriptionForm
            expense={editing ?? undefined}
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
        {adminMode && (spendAdding || spendEditing) && (
          <ExpenseForm
            spend={spendEditing ?? undefined}
            defaults={spendDefaults}
            klarnaLeft={plan && budget ? budget.klarnaLimit - plan.klarnaUsed : null}
            onSave={(spend) => queueSpendOps([{ type: "add", spend }])}
            onClose={() => {
              setSpendAdding(false);
              setSpendEditing(null);
              setSpendDefaults(undefined);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adminMode && (paymentAdding || paymentEditing) && (
          <KlarnaPaymentForm
            payment={paymentEditing ?? undefined}
            months={monthChoices}
            initialFor={paymentEditing ? monthOf(paymentEditing.for) : firstOwing}
            onSave={savePayment}
            onClose={() => {
              setPaymentAdding(false);
              setPaymentEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
