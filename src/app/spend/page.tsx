"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Plus, Pencil, Trash2, Lock, CreditCard, CalendarClock, Pause, Play, Scissors, PiggyBank, Repeat,
  type LucideIcon,
} from "lucide-react";
import {
  type Budget, type BudgetOp, type CardOp, type Expense, type ExpenseOp, type ExpensePatch, type PaymentCard,
  type Spend, type SpendOp,
  CARD_COLOURS, DEFAULT_CURRENCY, applyBudgetOps, applyCardOps, applyExpenseOps, applySpendOps, cycleLabel,
  formatMoney, monthPlan, nextCharge, shortDate, spendingBetween, todayLocal, totalsByCurrency, whenLabel,
  yearlyCost,
} from "@/lib/money";
import { useOpSync, type SyncState } from "@/lib/useOpSync";
import { SubscriptionForm } from "@/components/SubscriptionForm";
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

const addButton =
  "w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-wider hover:bg-cyan-500/10 transition-colors";

const eur = (cents: number) => formatMoney(cents, DEFAULT_CURRENCY);
const money = (cents: number, currency: string) => formatMoney(cents, currency);

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
  <div className="flex items-center gap-3 mb-4 flex-wrap">
    <Icon size={18} className="text-cyan-400" />
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
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [spendEditing, setSpendEditing] = useState<Spend | null>(null);
  const [spendAdding, setSpendAdding] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [newCard, setNewCard] = useState("");
  const [newLast4, setNewLast4] = useState("");
  const [newColour, setNewColour] = useState<string>(CARD_COLOURS[0]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showEnded, setShowEnded] = useState(false);

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

  const { items: spending, syncState: spendSync, queueOps: queueSpendOps } = useOpSync<Spend, SpendOp>({
    endpoint: "/api/money/spending",
    apply: applySpendOps,
    resultKey: "spending",
    password,
    unlocked: adminMode,
    authReads: true,
  });

  const syncState = worst(expenseSync, cardSync, budgetSync, spendSync);
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
  const totals = useMemo(() => totalsByCurrency(active), [active]);
  const trials = useMemo(() => active.filter((e) => e.trialEndsAt && e.trialEndsAt >= today), [active, today]);

  const plan = useMemo(() => (budget ? monthPlan(budget, expenses, spending, today) : null), [budget, expenses, spending, today]);
  // Without a budget there is no budget month yet, so the list shows the calendar month.
  const monthSpending = useMemo(() => {
    const from = plan?.start ?? `${today.slice(0, 7)}-01`;
    const to = plan?.end ?? `${today.slice(0, 7)}-31`;
    return spendingBetween(spending, from, to);
  }, [plan, spending, today]);
  const foreign = useMemo(() => active.some((e) => e.currency !== DEFAULT_CURRENCY), [active]);

  const save = (expense: Expense) => queueOps([{ type: "add", expense }]);
  const patch = (id: string, set: ExpensePatch) => queueOps([{ type: "patch", id, set }]);

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
            <div className={`mt-6 text-[10px] font-bold ${SYNC_LABEL[syncState].cls}`}>{SYNC_LABEL[syncState].text}</div>
          ) : (
            <div className="flex items-center gap-2 mt-6 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
              <Lock size={11} /> Locked · unlock with your admin key in the menu
            </div>
          )}
        </header>

        {!adminMode ? (
          <>
            <section className="mb-12">
              <Heading icon={PiggyBank} title="Monthly budget" />
              <Hidden />
            </section>
            <section className="mb-12">
              <Heading icon={Repeat} title="Subscriptions" />
              <Hidden />
            </section>
          </>
        ) : (
          <>
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
                    title="Edit budget"
                    className="ml-auto p-1.5 text-zinc-700 hover:text-cyan-400 transition-colors"
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
                <div className="p-5 border border-zinc-800 bg-[#0a0a0a]">
                  <Line label="Budget" value={eur(plan.income)} />
                  <Line label="Subscriptions" value={`− ${eur(plan.subscriptions)}`} />
                  {plan.klarnaBack > 0 && <Line label="Klarna from last month" value={`− ${eur(plan.klarnaBack)}`} />}
                  <Line label="Spent" value={`− ${eur(plan.spent)}`} />
                  <div className="flex items-baseline justify-between gap-4 border-t border-zinc-800 mt-3 pt-3">
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-300">Left</span>
                    <span className={`text-3xl font-black ${plan.left < 0 ? "text-red-400" : "text-cyan-400"}`}>{eur(plan.left)}</span>
                  </div>
                  <p
                    className={`text-[11px] mt-3 ${
                      plan.klarnaUsed > budget.klarnaLimit ? "text-red-400" : "text-zinc-600"
                    }`}
                  >
                    Klarna: {eur(plan.klarnaUsed)} of {eur(budget.klarnaLimit)} used this month, paid back out of next month.
                  </p>
                  {foreign && <p className="text-[10px] text-zinc-700 mt-1">Subscriptions not in euro are left out of this.</p>}
                </div>
              )}

              <div className="mt-4">
                <button onClick={() => setSpendAdding(true)} className={addButton}>
                  <Plus size={14} /> Add expense
                </button>
              </div>

              {monthSpending.length === 0 ? (
                <p className="mt-4 text-[11px] text-zinc-700 uppercase tracking-wider">No expenses yet this month</p>
              ) : (
                <div className="mt-4 space-y-1">
                  {monthSpending.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 border border-zinc-900 bg-black/40">
                      <span className="text-[10px] text-zinc-600 w-14 shrink-0">{shortDate(s.date)}</span>
                      <button
                        onClick={() => setSpendEditing(s)}
                        title="Edit"
                        className="text-sm text-zinc-300 hover:text-white flex-1 min-w-0 truncate text-left transition-colors"
                      >
                        {s.where}
                      </button>
                      {s.klarna && (
                        <span className="px-1.5 py-0.5 border border-pink-500/30 text-pink-400 text-[9px] font-black uppercase tracking-wider">
                          Klarna
                        </span>
                      )}
                      <span className="text-sm font-black text-zinc-200 shrink-0">{eur(s.amount)}</span>
                      <button
                        onClick={() =>
                          confirmId === `s${s.id}` ? queueSpendOps([{ type: "remove", id: s.id }]) : setConfirmId(`s${s.id}`)
                        }
                        onBlur={() => setConfirmId((id) => (id === `s${s.id}` ? null : id))}
                        title={confirmId === `s${s.id}` ? "Click again to delete" : "Delete"}
                        className={`p-1 transition-colors ${confirmId === `s${s.id}` ? "text-red-400" : "text-zinc-800 hover:text-red-400"}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
              >
                <button
                  onClick={() => setShowCards(!showCards)}
                  className="ml-auto flex items-center gap-1.5 px-2.5 py-1 border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-wider hover:border-zinc-700 transition-colors"
                >
                  <CreditCard size={12} /> Cards
                </button>
              </Heading>

              {/* CARDS */}
              <AnimatePresence>
                {showCards && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 overflow-hidden"
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
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mb-4">
                <button onClick={() => setAdding(true)} className={addButton}>
                  <Plus size={14} /> Add subscription
                </button>
              </div>

              {/* TRIALS ABOUT TO BITE */}
              {trials.length > 0 && (
                <div className="space-y-2 mb-4">
                  {trials.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 p-3 border border-yellow-500/30 bg-yellow-500/5">
                      <CalendarClock size={14} className="text-yellow-400 shrink-0" />
                      <span className="text-sm font-bold text-white flex-1 truncate">{e.name}</span>
                      <span className="text-[11px] text-yellow-400 font-bold">starts charging {whenLabel(e.trialEndsAt!, today)}</span>
                      <span className="text-xs font-black text-zinc-300">{money(e.amount, e.currency)}</span>
                    </div>
                  ))}
                </div>
              )}

              {active.length === 0 && paused.length === 0 ? (
                <p className="text-[11px] text-zinc-700 uppercase tracking-wider">No subscriptions yet</p>
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
          </>
        )}
      </div>

      <AnimatePresence>
        {adminMode && (adding || editing) && (
          <SubscriptionForm
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
        {adminMode && (spendAdding || spendEditing) && (
          <ExpenseForm
            spend={spendEditing ?? undefined}
            klarnaLeft={plan && budget ? budget.klarnaLimit - plan.klarnaUsed : null}
            onSave={(spend) => queueSpendOps([{ type: "add", spend }])}
            onClose={() => {
              setSpendAdding(false);
              setSpendEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
