"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Plus, Pencil, Trash2, Lock, CreditCard, CalendarClock, Pause, Play, Scissors, Check, TrendingDown,
} from "lucide-react";
import {
  type CardOp, type Expense, type ExpenseOp, type ExpensePatch, type PaymentCard,
  CARD_COLOURS, applyCardOps, applyExpenseOps, chargesBetween, cutThisYear, cycleLabel, formatMoney,
  monthlyByCard, monthlyCost, needsReview, nextCharge, todayLocal, whenLabel, yearlyCost,
} from "@/lib/money";
import { useOpSync, type SyncState } from "@/lib/useOpSync";
import { SpendForm } from "@/components/SpendForm";

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

  const { items: expenses, syncState, queueOps } = useOpSync<Expense, ExpenseOp>({
    endpoint: "/api/money/subs",
    apply: applyExpenseOps,
    resultKey: "expenses",
    password,
    unlocked: adminMode,
    authReads: true,
  });

  const { items: cards, queueOps: queueCardOps } = useOpSync<PaymentCard, CardOp>({
    endpoint: "/api/money/cards",
    apply: applyCardOps,
    resultKey: "cards",
    password,
    unlocked: adminMode,
    authReads: true,
  });

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

  const save = (expense: Expense) => queueOps([{ type: "add", expense }]);
  const patch = (id: string, set: ExpensePatch) => queueOps([{ type: "patch", id, set }]);

  const money = (cents: number, currency: string) => formatMoney(cents, currency);

  if (!adminMode) {
    return (
      <main className="relative min-h-screen bg-[#0d0d0d] text-[#f4f4f5] font-mono grid place-items-center px-6">
        <div className="text-center">
          <Lock size={22} className="mx-auto text-zinc-800 mb-4" />
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-700">Locked</p>
        </div>
      </main>
    );
  }

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
          <div className="flex items-center gap-3 mt-6 flex-wrap">
            <span className={`text-[10px] font-bold ${SYNC_LABEL[syncState].cls}`}>{SYNC_LABEL[syncState].text}</span>
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-4 py-2 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-wider hover:bg-cyan-500/10 transition-colors"
            >
              <Plus size={14} /> Add cost
            </button>
            <button
              onClick={() => setShowCards(!showCards)}
              className="flex items-center gap-2 px-4 py-2 border border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-wider hover:border-zinc-700 transition-colors"
            >
              <CreditCard size={14} /> Cards
            </button>
          </div>
        </header>

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
            <div className="flex items-center gap-3 mb-4">
              <CalendarClock size={18} className="text-yellow-400" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Trials ending</span>
            </div>
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
          <div className="flex items-center gap-3 mb-4">
            <CalendarClock size={18} className="text-cyan-400" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Leaving the account</span>
            <span className="text-[10px] text-zinc-700 uppercase">next 30 days</span>
          </div>
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
            <div className="flex items-center gap-3 mb-4">
              <CreditCard size={18} className="text-cyan-400" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Per card, per month</span>
            </div>
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
            <div className="flex items-center gap-3 mb-4">
              <TrendingDown size={18} className="text-cyan-400" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Worth it?</span>
              <span className="text-[10px] text-zinc-700 normal-case">not looked at in a while</span>
            </div>
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

        {/* EVERYTHING */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Wallet size={18} className="text-cyan-400" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Everything recurring</span>
          </div>

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
      </div>

      <AnimatePresence>
        {(adding || editing) && (
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
    </main>
  );
}
