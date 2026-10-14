"use client";
import { motion } from "framer-motion";
import { Plane, Tag, Lock, ChevronRight } from "lucide-react";
import {
  type Goal, type GoalOp, type SubGoal,
  formatClock, formatCountdown, lateText, timerRemaining, timerRunning, toggleSubDone,
} from "@/lib/goals";

// The goals as an airport departures board: each goal is a flight, its open
// to-dos are the rows under it. Same idea as the board on the study page, kept
// calm on purpose: nothing here shouts, a late to-do is just "delayed".

interface GoalBoardProps {
  goals: Goal[];
  isAdmin: boolean;
  onOps: (ops: GoalOp[]) => void;
  onOpen: (id: string) => void;
}

const flightCode = (id: string) => `GV${id.slice(-4).toUpperCase()}`;

const departs = (deadline: string) => {
  const d = new Date(deadline);
  return {
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
    date: d.toLocaleDateString([], { day: "numeric", month: "short" }),
  };
};

const status = (sg: SubGoal): { text: string; cls: string; sub?: string } => {
  const cd = sg.deadline ? formatCountdown(sg.deadline) : null;
  if (sg.active) {
    return {
      text: "On it",
      cls: "text-amber-300 bg-amber-500/10 border-amber-500/30",
      sub: sg.timer && timerRunning(sg.timer) ? formatClock(timerRemaining(sg.timer)) : undefined,
    };
  }
  if (cd?.overdue) return { text: "Delayed", cls: "text-orange-200/70 bg-orange-300/[0.06] border-orange-300/20", sub: lateText(cd) };
  if (cd?.urgent) return { text: "Boarding", cls: "text-yellow-300 bg-yellow-500/10 border-yellow-500/30", sub: `T-${cd.text}` };
  if (cd) return { text: "On time", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", sub: `T-${cd.text}` };
  return { text: "Anytime", cls: "text-zinc-500 bg-zinc-900/60 border-zinc-800" };
};

export const GoalBoard = ({ goals, isAdmin, onOps, onOpen }: GoalBoardProps) => {
  const now = new Date();

  return (
    <div
      className="relative z-10 mb-20 border-2 border-yellow-500/25 bg-[#0a0a0a] overflow-hidden"
      style={{ boxShadow: "0 0 50px rgba(234, 179, 8, 0.08)" }}
    >
      {/* board header */}
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 bg-gradient-to-r from-yellow-500/15 via-yellow-500/5 to-yellow-500/15 border-b-2 border-yellow-500/25">
        <div className="flex items-center gap-3">
          <Plane size={22} className="text-yellow-400 -rotate-45" />
          <div>
            <div className="text-[8px] md:text-[10px] font-bold text-yellow-500/70 tracking-[0.3em] uppercase">Task Forge</div>
            <div className="text-lg md:text-xl font-black text-yellow-400 tracking-wider">DEPARTURES</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-zinc-600 uppercase">Local time</div>
          <div className="text-base md:text-lg font-mono font-bold text-yellow-400">
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
          </div>
        </div>
      </div>

      {/* column names, wide screens only */}
      <div className="hidden sm:grid grid-cols-[44px_1fr_110px_130px] gap-3 px-4 md:px-6 py-2 bg-zinc-900/50 border-b border-zinc-800 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
        <div />
        <div>To-do</div>
        <div>Due</div>
        <div className="text-right">Status</div>
      </div>

      {goals.length === 0 ? (
        <div className="p-12 text-center text-zinc-600 font-mono">NO SCHEDULED DEPARTURES</div>
      ) : (
        goals.map((g, gi) => {
          const subs = g.subgoals ?? [];
          const open = subs.filter((s) => !s.completed);
          const done = subs.length - open.length;
          return (
            <motion.section
              key={g.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(gi, 10) * 0.04 }}
              className="border-b border-zinc-900 last:border-b-0"
            >
              {/* the flight: one goal */}
              <button
                onClick={() => onOpen(g.id)}
                className="w-full flex items-center gap-3 px-4 md:px-6 py-3 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors text-left group"
              >
                <span className="font-mono font-bold text-yellow-400 text-sm shrink-0">{flightCode(g.id)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold uppercase tracking-tight text-zinc-100 truncate">{g.task}</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-zinc-600 uppercase">
                    <Tag size={9} /> {g.project}
                    {g.private && <><Lock size={9} className="ml-1" /> Private</>}
                  </span>
                </span>
                <span className="text-[10px] font-mono text-zinc-600 shrink-0">
                  {subs.length ? `${done}/${subs.length}` : ""}
                </span>
                <ChevronRight size={14} className="text-zinc-700 group-hover:text-yellow-400 transition-colors shrink-0" />
              </button>

              {/* its open to-dos */}
              {open.length === 0 ? (
                <div className="px-4 md:px-6 py-2.5 text-[10px] font-mono uppercase tracking-wider text-zinc-700">
                  {subs.length ? "All clear ✓" : "No to-dos yet"}
                </div>
              ) : (
                <ul className="divide-y divide-zinc-900/80">
                  {open.map((sg) => {
                    const st = status(sg);
                    const when = sg.deadline ? departs(sg.deadline) : null;
                    return (
                      <li
                        key={sg.id}
                        className={`grid grid-cols-[44px_1fr_auto] sm:grid-cols-[44px_1fr_110px_130px] items-center gap-x-3 px-4 md:px-6 py-1.5 ${
                          sg.active ? "bg-amber-500/[0.04]" : ""
                        }`}
                      >
                        <button
                          onClick={() => isAdmin && onOps([{ type: "sub", id: g.id, sub: toggleSubDone(sg) }])}
                          disabled={!isAdmin}
                          aria-label="Mark as done"
                          title="Mark as done"
                          className={`h-9 w-9 -ml-1.5 grid place-items-center font-mono text-sm ${
                            isAdmin ? "text-zinc-700 hover:text-emerald-400" : "text-zinc-800 cursor-default"
                          }`}
                        >
                          [&nbsp;]
                        </button>

                        <div className="min-w-0 py-1">
                          <div className={`text-sm font-mono break-words leading-snug ${sg.active ? "text-zinc-100" : "text-zinc-400"}`}>
                            {sg.text}
                          </div>
                          {/* on phones the due time sits under the text */}
                          {when && (
                            <div className="sm:hidden text-[10px] font-mono text-zinc-600 mt-0.5">
                              {when.time} · {when.date}
                            </div>
                          )}
                        </div>

                        <div className="hidden sm:block font-mono">
                          {when ? (
                            <>
                              <div className="text-sm font-bold text-zinc-300">{when.time}</div>
                              <div className="text-[10px] text-zinc-600">{when.date}</div>
                            </>
                          ) : (
                            <div className="text-sm text-zinc-700">—</div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`px-2 py-0.5 border text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${st.cls}`}>
                            {st.text}
                          </span>
                          {st.sub && <span className="text-[10px] font-mono text-zinc-600">{st.sub}</span>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.section>
          );
        })
      )}
    </div>
  );
};
