"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SortableList, useSortableItem } from "@/components/Sortable";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import {
  X, Tag, Clock, Activity, Timer, AlertTriangle, Pencil, Check,
  SlidersHorizontal, Play, Pause, RotateCcw, Hourglass,
  CalendarClock, Trash2, Lock, Eye, CheckCheck, Hammer, Snail,
} from "lucide-react";
import {
  type Goal, type GoalOp, type GoalPatch, type SubGoal,
  formatCountdown, formatClock, formatDuration, formatTimeLeft, hoursFromNow,
  subClearsAt, timerRemaining, timerRunning, timerFinished, toggleSubDone, lateText,
} from "@/lib/goals";
import { requestNotifPermission } from "@/lib/notify";
import type { SyncState } from "@/lib/useGoalSync";
import { DeviceReminders, GoalReminders } from "@/components/ReminderSettings";

// --- shared bits ------------------------------------------------------------

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700 mb-2">{children}</div>
);

const chip =
  "px-2.5 py-1 bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-[10px] font-bold uppercase transition-colors";
const chipHover = "hover:border-emerald-500/30 hover:text-emerald-400";

const DEADLINE_PRESETS = [
  { label: "1h", hours: 1 },
  { label: "3h", hours: 3 },
  { label: "6h", hours: 6 },
  { label: "12h", hours: 12 },
  { label: "24h", hours: 24 },
  { label: "2d", hours: 48 },
  { label: "1w", hours: 168 },
];

const TIME_UNITS = [
  { value: "m", label: "minutes", seconds: 60 },
  { value: "h", label: "hours", seconds: 3600 },
  { value: "d", label: "days", seconds: 86400 },
] as const;
type TimeUnit = (typeof TIME_UNITS)[number]["value"];

/** The biggest unit a duration fits into evenly, so 7200s reads as "2 hours". */
const splitDuration = (seconds: number): { amount: string; unit: TimeUnit } => {
  for (const u of [...TIME_UNITS].reverse()) {
    if (seconds >= u.seconds && seconds % u.seconds === 0) return { amount: String(seconds / u.seconds), unit: u.value };
  }
  return { amount: String(Math.max(1, Math.round(seconds / 60))), unit: "m" };
};

const fmtDateTime = (iso: string, withYear = false) =>
  `${new Date(iso).toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  })} at ${new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;

const field =
  "bg-black border border-zinc-800 px-3 py-2 text-xs outline-none focus:border-emerald-500/50 text-zinc-300 font-mono";
const clearBtn =
  "px-3 py-2 border border-zinc-800 bg-zinc-900/50 text-zinc-500 text-[10px] font-bold uppercase transition-colors hover:border-red-500/30 hover:text-red-400 disabled:opacity-30 disabled:pointer-events-none";

// --- one to-do --------------------------------------------------------------

interface SubgoalItemProps {
  sg: SubGoal;
  isAdmin: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onChange: (next: SubGoal) => void;
  onRemove: () => void;
}

const SubgoalItem = ({
  sg, isAdmin, expanded, onToggleExpanded, onChange, onRemove,
}: SubgoalItemProps) => {
  const { handle, setNodeRef, style, isDragging, enabled: canDrag } = useSortableItem(sg.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sg.text);
  const [timeAmount, setTimeAmount] = useState(() => (sg.timer ? splitDuration(sg.timer.duration).amount : ""));
  const [timeUnit, setTimeUnit] = useState<TimeUnit>(() => (sg.timer ? splitDuration(sg.timer.duration).unit : "m"));

  const running = timerRunning(sg.timer);
  const finished = timerFinished(sg.timer);
  const remaining = sg.timer ? timerRemaining(sg.timer) : 0;
  const cd = sg.deadline ? formatCountdown(sg.deadline) : null;
  const isActive = !!sg.active && !sg.completed;

  const commitText = () => {
    const text = draft.trim();
    setEditing(false);
    if (text && text !== sg.text) onChange({ ...sg, text });
    else setDraft(sg.text);
  };

  const toggleDone = () => {
    if (!isAdmin) return;
    onChange(toggleSubDone(sg));
  };

  const toggleActive = () => {
    if (!isAdmin || sg.completed) return;
    const next: SubGoal = { ...sg };
    if (isActive) delete next.active;
    else next.active = true;
    onChange(next);
  };

  const applyTimer = () => {
    const amount = Number(timeAmount);
    if (!(amount > 0)) return;
    const unit = TIME_UNITS.find((u) => u.value === timeUnit) ?? TIME_UNITS[0];
    const duration = Math.max(60, Math.round(amount * unit.seconds));
    onChange({ ...sg, timer: { duration, remaining: duration } });
  };

  const startPause = () => {
    if (!isAdmin || !sg.timer) return;
    if (running) {
      onChange({ ...sg, timer: { duration: sg.timer.duration, remaining: timerRemaining(sg.timer) } });
      return;
    }
    requestNotifPermission();
    const from = finished ? sg.timer.duration : sg.timer.remaining;
    onChange({
      ...sg,
      active: true,
      timer: { duration: sg.timer.duration, remaining: from, startedAt: new Date().toISOString() },
    });
  };

  const clearTimer = () => {
    const next = { ...sg };
    delete next.timer;
    setTimeAmount("");
    onChange(next);
  };

  const setDeadline = (value: string) => {
    const next = { ...sg };
    if (value) next.deadline = value;
    else delete next.deadline;
    onChange(next);
  };

  // The whole row is what you hold to move it. A key press only starts a move
  // when the row itself has focus, never from the text box or a button in it.
  const { onKeyDown: dragKey, ...dragHandle } = handle as { onKeyDown?: (e: React.KeyboardEvent) => void };
  const rowHandle = canDrag && isAdmin && !editing
    ? {
        ...dragHandle,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.target === e.currentTarget) dragKey?.(e);
        },
      }
    : {};

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...rowHandle}
      className={`group relative border transition-colors ${
        isDragging ? "border-emerald-500/50 shadow-lg shadow-black/40" : ""
      } ${
        sg.completed
          ? "bg-zinc-900/30 border-zinc-800"
          : isActive
            ? "bg-amber-500/[0.04] border-zinc-800 hover:border-amber-500/30"
            : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
      }`}
    >
      {isActive && <span className="absolute z-10 left-0 top-0 bottom-0 w-[2px] bg-amber-400 motion-safe:animate-pulse" />}

      <div className="flex items-stretch">

        <SwipeToDelete onDelete={onRemove} disabled={!isAdmin || editing || isDragging} className="bg-[#0a0a0a]">
        <div className={`flex items-start gap-1 p-2 pl-2.5 ${isActive ? "bg-amber-500/[0.04]" : "bg-zinc-900/50"}`}>

        <button
          onClick={toggleDone}
          disabled={!isAdmin}
          className={`shrink-0 h-9 w-9 grid place-items-center font-mono text-sm transition-colors ${isAdmin ? "cursor-pointer" : "cursor-default"}`}
          title={sg.completed ? "Mark as not done" : "Mark as done"}
          aria-label={sg.completed ? "Mark as not done" : "Mark as done"}
        >
          <span className={sg.completed ? "text-emerald-500" : "text-zinc-700 hover:text-zinc-500"}>
            [{sg.completed ? <span className="text-emerald-400">■</span> : <span className="text-zinc-800">&nbsp;</span>}]
          </span>
        </button>

        <div className="flex-1 min-w-0 py-1.5 pl-1">
          {editing ? (
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitText();
                if (e.key === "Escape") {
                  setDraft(sg.text);
                  setEditing(false);
                }
              }}
              autoFocus
              className="w-full bg-black border border-zinc-700 px-2 py-1 text-sm text-white font-mono outline-none focus:border-emerald-500/50"
            />
          ) : (
            <span
              onClick={() => {
                if (!isAdmin) return;
                setDraft(sg.text);
                setEditing(true);
              }}
              className={`block text-sm font-mono break-words leading-snug ${
                isAdmin ? "cursor-text hover:text-white" : ""
              } ${sg.completed ? "text-zinc-600 line-through" : isActive ? "text-zinc-200" : "text-zinc-400"}`}
            >
              {sg.text}
            </span>
          )}

          {(sg.timer || cd) && !editing && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {sg.timer && (
                <button
                  onClick={startPause}
                  disabled={!isAdmin}
                  title={running ? "Pause" : finished ? "Start again" : "Start"}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-[10px] font-bold font-mono transition-colors ${
                    running
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                      : finished
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-500"
                  } ${isAdmin ? "hover:border-amber-500/50 hover:text-amber-300 cursor-pointer" : "cursor-default"}`}
                >
                  {running ? <Pause size={9} /> : finished ? <RotateCcw size={9} /> : <Play size={9} />}
                  <span className={running ? "motion-safe:animate-pulse" : ""}>{formatClock(remaining)}</span>
                  <span className="text-zinc-600">/ {formatDuration(sg.timer.duration)}</span>
                </button>
              )}
              {cd && sg.deadline && (
                <span
                  title={fmtDateTime(sg.deadline)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[10px] font-bold font-mono ${
                    sg.completed
                      ? "border-zinc-800 text-zinc-700"
                      : cd.overdue
                        ? "bg-orange-300/[0.06] border-orange-300/20 text-orange-200/70"
                        : cd.urgent
                          ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                          : "bg-zinc-900/60 border-zinc-800 text-zinc-500"
                  }`}
                >
                  {cd.overdue ? <Snail size={9} /> : <CalendarClock size={9} />}
                  {cd.overdue ? lateText(cd) : cd.text}
                </span>
              )}
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-center shrink-0 -mr-1">
            {/* Working on it: far from the tick box, so a thumb cannot hit the wrong one. */}
            <button
              onClick={toggleActive}
              title={isActive ? "Stop working on this" : "Working on this"}
              aria-label={isActive ? "Stop working on this" : "Working on this"}
              aria-pressed={isActive}
              className={`h-9 w-9 grid place-items-center transition-colors ${
                isActive ? "text-amber-400" : "text-zinc-700 hover:text-amber-400"
              }`}
            >
              <Hammer size={15} className={isActive ? "motion-safe:animate-pulse" : ""} />
            </button>
            <button
              onClick={onToggleExpanded}
              title="Timer, due date"
              aria-label="To-do options"
              aria-expanded={expanded}
              className={`h-9 w-8 grid place-items-center transition-colors ${expanded ? "text-emerald-400" : "text-zinc-700 hover:text-zinc-300"}`}
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
        )}
        </div>
        </SwipeToDelete>
      </div>

      <AnimatePresence initial={false}>
        {isAdmin && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-800/80 px-3 py-3 space-y-4 bg-black/40">
              <div>
                <Label>
                  <span className="inline-flex items-center gap-1.5">
                    <Hourglass size={9} /> Timer
                  </span>
                </Label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="25"
                    aria-label="Timer length"
                    value={timeAmount}
                    onChange={(e) => setTimeAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyTimer()}
                    className={`${field} w-16 min-w-0`}
                  />
                  <select
                    value={timeUnit}
                    aria-label="Timer unit"
                    onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}
                    className={`${field} flex-1 min-w-0`}
                  >
                    {TIME_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={applyTimer}
                    disabled={!(Number(timeAmount) > 0)}
                    className="px-3 py-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase transition-colors hover:bg-emerald-500/20 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Set
                  </button>
                  <button onClick={clearTimer} disabled={!sg.timer} className={clearBtn}>
                    Clear
                  </button>
                </div>
              </div>

              <div>
                <Label>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock size={9} /> Due
                  </span>
                </Label>
                <div className="flex gap-1.5">
                  <input
                    type="datetime-local"
                    aria-label="Due date and time"
                    value={sg.deadline || ""}
                    onChange={(e) => setDeadline(e.target.value)}
                    className={`${field} flex-1 min-w-0`}
                  />
                  <button onClick={() => setDeadline("")} disabled={!sg.deadline} className={clearBtn}>
                    Clear
                  </button>
                </div>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={onRemove}
                  className={`${chip} w-full inline-flex items-center justify-center gap-1 py-2 hover:border-rose-400/30 hover:text-rose-300`}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
};

// --- the goal window --------------------------------------------------------

interface GoalDetailModalProps {
  goal: Goal;
  isAdmin: boolean;
  /** The admin key, for signing this device up for reminders. */
  adminKey: string;
  syncState: SyncState;
  onOps: (ops: GoalOp[]) => void;
  onRetrySync: () => void;
  onClose: () => void;
}

export const GoalDetailModal = ({ goal, isAdmin, adminKey, syncState, onOps, onRetrySync, onClose }: GoalDetailModalProps) => {
  const [tab, setTab] = useState<"tasks" | "done" | "info">("tasks");
  const all = useMemo(() => goal.subgoals ?? [], [goal.subgoals]);
  // The working list holds what is still to do; finished ones move next door.
  const subgoals = useMemo(() => all.filter((sg) => !sg.completed), [all]);
  const finished = useMemo(
    () => all.filter((sg) => sg.completed).sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    [all]
  );


  const [newSubgoal, setNewSubgoal] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [title, setTitle] = useState(goal.task);
  const [editingTitle, setEditingTitle] = useState(false);
  const [project, setProject] = useState(goal.project);
  const [editingProject, setEditingProject] = useState(false);
  const [description, setDescription] = useState(goal.description ?? "");
  const [editingDescription, setEditingDescription] = useState(false);
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);

  // Drafts are filled in when editing starts, so what is on screen the rest of
  // the time is always the saved value.
  const startEditingTitle = () => {
    if (!isAdmin) return;
    setTitle(goal.task);
    setEditingTitle(true);
  };
  const startEditingProject = () => {
    if (!isAdmin) return;
    setProject(goal.project);
    setEditingProject(true);
  };
  const startEditingDescription = () => {
    if (!isAdmin) return;
    setDescription(goal.description ?? "");
    setEditingDescription(true);
  };

  // Keep the clocks moving while any time-box runs.
  const anyRunning = subgoals.some((sg) => timerRunning(sg.timer));
  // Held in state rather than read during render, so the clocks tick without
  // the component reading the wall clock while React is drawing it.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!anyRunning && tab !== "done") return;
    const i = setInterval(() => setNow(Date.now()), anyRunning ? 1000 : 60000);
    return () => clearInterval(i);
  }, [anyRunning, tab]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // While a field is focused, Escape belongs to that field.
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      onClose();
    };
    // Capture phase, so the check happens before React clears the focused field.
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  const patch = useCallback(
    (set: GoalPatch) => {
      if (!isAdmin) return;
      onOps([{ type: "patch", id: goal.id, set }]);
    },
    [goal.id, isAdmin, onOps]
  );

  const changeSubgoal = useCallback(
    (next: SubGoal) => {
      if (!isAdmin) return;
      const ops: GoalOp[] = [{ type: "sub", id: goal.id, sub: next }];
      // One clock at a time: starting this one pauses any other that is running.
      if (next.timer?.startedAt) {
        for (const sg of subgoals) {
          if (sg.id !== next.id && sg.timer?.startedAt) {
            ops.push({
              type: "sub",
              id: goal.id,
              sub: { ...sg, timer: { duration: sg.timer.duration, remaining: timerRemaining(sg.timer) } },
            });
          }
        }
      }
      onOps(ops);
    },
    [goal.id, isAdmin, onOps, subgoals]
  );

  /** Unfinished order first, finished ones kept behind it. */
  const withFinished = (ids: string[]) => [...ids, ...finished.map((sg) => sg.id)];

  const reorderSubgoals = (ids: string[]) => {
    if (!isAdmin) return;
    onOps([{ type: "subOrder", id: goal.id, ids: withFinished(ids) }]);
  };

  const addSubgoal = () => {
    const text = newSubgoal.trim();
    if (!text || !isAdmin) return;
    onOps([{ type: "sub", id: goal.id, sub: { id: Date.now().toString(), text, completed: false } }]);
    setNewSubgoal("");
  };

  const restoreSubgoal = (sg: SubGoal) => {
    if (!isAdmin) return;
    const next: SubGoal = { ...sg, completed: false };
    delete next.completedAt;
    onOps([{ type: "sub", id: goal.id, sub: next }]);
  };

  // The last deleted to-do, held for a few seconds so a swipe that went too
  // far can be taken back.
  const [lastDeleted, setLastDeleted] = useState<{ sub: SubGoal; order: string[] } | null>(null);
  useEffect(() => {
    if (!lastDeleted) return;
    const t = setTimeout(() => setLastDeleted(null), 5000);
    return () => clearTimeout(t);
  }, [lastDeleted]);

  const removeSubgoal = (subId: string) => {
    if (!isAdmin) return;
    const sub = all.find((sg) => sg.id === subId);
    setExpandedId(null);
    onOps([{ type: "subRemove", id: goal.id, subId }]);
    if (sub) setLastDeleted({ sub, order: all.map((sg) => sg.id) });
  };

  const undoDelete = () => {
    if (!lastDeleted || !isAdmin) return;
    onOps([
      { type: "sub", id: goal.id, sub: lastDeleted.sub },
      { type: "subOrder", id: goal.id, ids: lastDeleted.order },
    ]);
    setLastDeleted(null);
  };

  const done = finished.length;
  const progress = all.length ? (done / all.length) * 100 : 0;
  const activeCount = subgoals.filter((sg) => sg.active).length;
  const goalCd = goal.deadline ? formatCountdown(goal.deadline) : null;

  const sync: Record<SyncState, { text: string; cls: string }> = {
    synced: { text: "● SYNCED", cls: "text-emerald-600" },
    syncing: { text: "◌ SYNCING", cls: "text-amber-400 motion-safe:animate-pulse" },
    unsaved: { text: "○ QUEUED", cls: "text-zinc-500" },
    error: { text: "! UNSENT_KEPT_ON_DEVICE", cls: "text-red-400" },
    rejected: { text: "! ADMIN_KEY_REJECTED", cls: "text-red-400" },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] flex items-end md:items-center justify-center md:p-4"
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="relative bg-[#0a0a0a] border border-zinc-800 w-full md:max-w-lg h-[92dvh] md:h-auto md:max-h-[85vh] overflow-hidden font-mono z-[610] flex flex-col"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-[620] text-zinc-500 hover:text-emerald-400 transition-colors bg-[#0a0a0a]/80 backdrop-blur-sm rounded-full p-1"
        >
          <X size={20} />
        </button>

        {/* header */}
        <div className="px-5 pt-5 border-b border-zinc-800 shrink-0">
          {editingTitle && isAdmin ? (
            <div className="flex items-center gap-2 mb-3 w-[90%]">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    setTitle(goal.task);
                    setEditingTitle(false);
                  }
                }}
                onBlur={() => {
                  setEditingTitle(false);
                  patch({ task: title });
                }}
                autoFocus
                className="flex-1 bg-black border border-zinc-800 px-3 py-2 text-lg font-bold uppercase tracking-tight text-white outline-none focus:border-emerald-500/50 font-mono"
              />
              <span className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Check size={16} />
              </span>
            </div>
          ) : (
            <h2
              onClick={startEditingTitle}
              className={`text-lg md:text-xl font-bold uppercase tracking-tight text-white leading-tight group flex items-start gap-2 mb-3 w-[90%] ${
                isAdmin ? "cursor-pointer hover:text-emerald-100" : ""
              }`}
            >
              <span className="break-words">{goal.task}</span>
              {isAdmin && (
                <Pencil size={14} className="opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity shrink-0 mt-1" />
              )}
            </h2>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {editingProject && isAdmin ? (
              <div className="flex items-center">
                <span className="flex items-center px-2 py-1 bg-black border border-zinc-800 border-r-0">
                  <Tag size={10} className="text-zinc-600" />
                </span>
                <input
                  type="text"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") {
                      setProject(goal.project);
                      setEditingProject(false);
                    }
                  }}
                  onBlur={() => {
                    setEditingProject(false);
                    patch({ project });
                  }}
                  autoFocus
                  className="bg-black border border-zinc-800 px-2 py-1 text-[10px] font-black uppercase text-emerald-400 outline-none focus:border-emerald-500/50 w-28 font-mono"
                />
              </div>
            ) : (
              <button
                onClick={startEditingProject}
                className={`flex items-center gap-2 ${chip} font-black group ${isAdmin ? `${chipHover} cursor-pointer` : "cursor-default"}`}
              >
                <Tag size={10} />
                {goal.project}
                {isAdmin && <Pencil size={8} className="opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity" />}
              </button>
            )}

            <span className={`flex items-center gap-2 ${chip} text-zinc-600`}>
              <Clock size={10} /> {goal.date}
            </span>

            {goal.private && (
              <span className={`flex items-center gap-2 ${chip} font-black`} title="Hidden unless the admin key is entered">
                <Lock size={10} /> Private
              </span>
            )}

            <span
              className={`flex items-center gap-2 px-2.5 py-1 border text-[10px] font-black uppercase ${
                goal.priority === "High"
                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                  : goal.priority === "Medium"
                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              }`}
            >
              <Activity size={10} /> {goal.priority}
            </span>

            {goalCd && goal.deadline && (
              <button
                onClick={() => {
                  if (!isAdmin) return;
                  setTab("info");
                  setShowDeadlineInput(true);
                }}
                title={fmtDateTime(goal.deadline)}
                className={`flex items-center gap-1.5 px-2.5 py-1 border text-[10px] font-bold font-mono ${
                  goalCd.overdue
                    ? "bg-red-500/10 text-red-400 border-red-500/30"
                    : goalCd.urgent
                      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                      : "bg-zinc-900/50 text-zinc-500 border-zinc-800"
                }`}
              >
                {goalCd.overdue ? <AlertTriangle size={10} /> : <Timer size={10} />}
                {goalCd.text}
              </button>
            )}
          </div>

          <div className="flex -mb-px">
            {(
              [
                { key: "tasks", label: "To-dos", meta: subgoals.length ? `${subgoals.length}` : "" },
                { key: "done", label: "Done", meta: done ? `${done}` : "" },
                { key: "info", label: "Info", meta: "" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative px-4 py-2.5 text-[11px] font-black uppercase tracking-widest border-b-2 transition-colors ${
                  tab === t.key ? "text-emerald-400 border-emerald-500" : "text-zinc-600 border-transparent hover:text-zinc-400"
                }`}
              >
                {t.label}
                {t.key === "info" && !isAdmin && <Lock size={9} className="inline ml-1.5 -mt-0.5" />}
                {t.meta && (
                  <span className={`ml-2 font-mono ${tab === t.key ? "text-emerald-600" : "text-zinc-700"}`}>{t.meta}</span>
                )}
                {t.key === "tasks" && activeCount > 0 && (
                  <span className="absolute top-2 right-0 h-1.5 w-1.5 rounded-full bg-amber-400 motion-safe:animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* body */}
        <motion.div layoutScroll className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar-mobile">
          {tab === "tasks" ? (
            <div className="p-5">
              {all.length > 0 && (
                <div className="mb-5">
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                    <span className="text-zinc-600">Progress</span>
                    <span className={done === all.length ? "text-emerald-400" : "text-zinc-500"}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500"
                      initial={false}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {subgoals.length === 0 ? (
                <div className="text-zinc-700 text-sm py-10 text-center border border-dashed border-zinc-800 uppercase">
                  {done > 0 ? "All_Done" : "No_To-Dos_Yet"}
                  {isAdmin && (
                    <div className="mt-2 text-[10px] text-zinc-800 normal-case">
                      {done > 0 ? "Nothing left to do here." : "Add the first one below."}
                    </div>
                  )}
                </div>
              ) : (
                <SortableList
                  ids={subgoals.map((sg) => sg.id)}
                  onReorder={reorderSubgoals}
                  enabled={isAdmin}
                  layout="list"
                  swipeRows
                >
                  <ul className="space-y-1">
                    {subgoals.map((sg) => (
                      <SubgoalItem
                        key={sg.id}
                        sg={sg}
                        isAdmin={isAdmin}
                        expanded={expandedId === sg.id}
                        onToggleExpanded={() => setExpandedId((cur) => (cur === sg.id ? null : sg.id))}
                        onChange={changeSubgoal}
                        onRemove={() => removeSubgoal(sg.id)}
                      />
                    ))}
                  </ul>
                </SortableList>
              )}

              {isAdmin && subgoals.length > 1 && (
                <div className="mt-3 text-[9px] text-zinc-800 uppercase tracking-wider">
                  <span className="md:hidden">Hold a to-do, then drag to move it · swipe left to delete</span>
                  <span className="hidden md:inline">Drag a to-do up or down to move it · drag it left to delete</span>
                </div>
              )}
            </div>
          ) : tab === "done" ? (
            <div className="p-5">
              {finished.length === 0 ? (
                <div className="text-zinc-700 text-sm py-10 text-center border border-dashed border-zinc-800 uppercase">
                  Nothing_Finished_Yet
                  <div className="mt-2 text-[10px] text-zinc-800 normal-case">
                    Ticked to-dos rest here for a day before they clear. Untick one to bring it back.
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4 text-[10px] text-zinc-700 uppercase tracking-wider">
                    <CheckCheck size={12} className="text-emerald-700" />
                    Clears a day after you tick it · untick to bring back · swipe left to delete
                  </div>
                  <ul className="space-y-1">
                    {finished.map((sg) => {
                      const clearsAt = subClearsAt(sg);
                      return (
                        <li key={sg.id} className="border border-zinc-800">
                          <SwipeToDelete onDelete={() => removeSubgoal(sg.id)} disabled={!isAdmin} className="bg-[#0a0a0a]">
                          <div className="flex items-start gap-2 p-2.5 pl-2 bg-zinc-900/30">
                          <button
                            onClick={() => restoreSubgoal(sg)}
                            disabled={!isAdmin}
                            title="Untick to put it back on the list"
                            aria-label="Mark as not done"
                            className={`shrink-0 -my-1.5 -ml-1 h-9 w-9 grid place-items-center font-mono text-sm text-emerald-500 ${
                              isAdmin ? "cursor-pointer hover:text-zinc-500" : "cursor-default"
                            }`}
                          >
                            <span>[<span className="text-emerald-400">■</span>]</span>
                          </button>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-mono text-zinc-600 line-through break-words leading-snug">
                              {sg.text}
                            </span>
                            <span className="block text-[10px] text-zinc-700 font-mono mt-1">
                              {clearsAt ? `clears in ${formatTimeLeft(clearsAt - now)}` : "clears within a day"}
                            </span>
                          </span>
                          </div>
                          </SwipeToDelete>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          ) : !isAdmin ? (
            <div className="p-5">
              <div className="border border-dashed border-zinc-800 py-12 px-6 text-center">
                <Lock size={20} className="mx-auto text-zinc-700 mb-4" />
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Private</div>
                <p className="mt-3 text-xs text-zinc-700 leading-relaxed max-w-xs mx-auto">
                  Notes, deadline and priority for this goal are locked. Enter the admin key in the
                  menu to read them.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {isAdmin && (
                <div>
                  <Label>Who can see this goal</Label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => patch({ private: false })}
                      className={`flex-1 py-2 inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider border transition-all ${
                        goal.private
                          ? "bg-zinc-900/30 text-zinc-600 border-zinc-800 hover:border-zinc-700 hover:text-zinc-500"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                      }`}
                    >
                      <Eye size={11} /> Anyone
                    </button>
                    <button
                      onClick={() => patch({ private: true })}
                      className={`flex-1 py-2 inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider border transition-all ${
                        goal.private
                          ? "bg-zinc-100/10 text-zinc-100 border-zinc-400/50"
                          : "bg-zinc-900/30 text-zinc-600 border-zinc-800 hover:border-zinc-700 hover:text-zinc-500"
                      }`}
                    >
                      <Lock size={11} /> Only me
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-zinc-700 leading-relaxed">
                    {goal.private
                      ? "This goal is left out of the page for anyone without the admin key, and it disappears here the moment you lock admin mode."
                      : "Everyone who opens the site can see this goal, though its notes stay private."}
                  </p>
                </div>
              )}

              {isAdmin && (
                <div>
                  <Label>Priority Level</Label>
                  <div className="flex gap-1">
                    {["Low", "Medium", "High"].map((p) => (
                      <button
                        key={p}
                        onClick={() => patch({ priority: p })}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider border transition-all ${
                          goal.priority === p
                            ? p === "High"
                              ? "bg-red-500/20 text-red-400 border-red-500/50"
                              : p === "Medium"
                                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                            : "bg-zinc-900/30 text-zinc-600 border-zinc-800 hover:border-zinc-700 hover:text-zinc-500"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Description</Label>
                {editingDescription && isAdmin ? (
                  <div className="space-y-2">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a description..."
                      autoFocus
                      onBlur={() => {
                        setEditingDescription(false);
                        patch({ description });
                      }}
                      className="w-full bg-black border border-zinc-800 px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-emerald-500/50 resize-y min-h-[6rem] font-mono placeholder:text-zinc-700"
                    />
                    <button
                      onClick={() => {
                        setEditingDescription(false);
                        patch({ description });
                      }}
                      className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase hover:bg-emerald-500/20 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                ) : goal.description ? (
                  <p
                    onClick={startEditingDescription}
                    className={`text-sm text-zinc-500 leading-relaxed p-3 bg-zinc-900/30 border border-zinc-800 group whitespace-pre-wrap ${
                      isAdmin ? "cursor-pointer hover:border-zinc-700 hover:text-zinc-400 transition-colors" : ""
                    }`}
                  >
                    {goal.description}
                    {isAdmin && <Pencil size={10} className="inline ml-2 opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity" />}
                  </p>
                ) : isAdmin ? (
                  <button
                    onClick={startEditingDescription}
                    className="w-full p-3 border border-dashed border-zinc-800 text-zinc-700 hover:border-emerald-500/30 hover:text-emerald-400 text-[10px] font-bold uppercase transition-colors"
                  >
                    + Add description
                  </button>
                ) : (
                  <div className="p-3 border border-zinc-800 text-zinc-700 text-sm italic">No description</div>
                )}
              </div>

              <div>
                <Label>Deadline</Label>
                {showDeadlineInput && isAdmin ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {DEADLINE_PRESETS.map((p) => (
                        <button key={p.label} onClick={() => patch({ deadline: hoursFromNow(p.hours) })} className={`${chip} ${chipHover}`}>
                          +{p.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="datetime-local"
                      value={goal.deadline || ""}
                      onChange={(e) => patch({ deadline: e.target.value })}
                      className="w-full bg-black border border-zinc-800 px-3 py-2.5 text-sm outline-none focus:border-emerald-500/50 text-zinc-300 font-mono"
                    />
                    {goal.deadline && <div className="text-[10px] text-zinc-600 font-mono">{fmtDateTime(goal.deadline, true)}</div>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeadlineInput(false)}
                        className="flex-1 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase hover:bg-emerald-500/20 transition-colors"
                      >
                        Done
                      </button>
                      <button
                        onClick={() => {
                          patch({ deadline: "" });
                          setShowDeadlineInput(false);
                        }}
                        className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase hover:bg-red-500/20 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : goal.deadline && goalCd ? (
                  <div
                    onClick={() => isAdmin && setShowDeadlineInput(true)}
                    className={`p-3 border group transition-colors ${
                      goalCd.overdue
                        ? "bg-red-500/10 border-red-500/30"
                        : goalCd.urgent
                          ? "bg-yellow-500/10 border-yellow-500/30"
                          : "bg-zinc-900/30 border-zinc-800"
                    } ${isAdmin ? "cursor-pointer hover:border-zinc-700" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {goalCd.overdue ? (
                          <AlertTriangle size={16} className="text-red-400" />
                        ) : (
                          <Timer size={16} className={goalCd.urgent ? "text-yellow-400" : "text-emerald-400"} />
                        )}
                        <span
                          className={`text-sm font-bold font-mono ${
                            goalCd.overdue ? "text-red-400" : goalCd.urgent ? "text-yellow-400" : "text-emerald-400"
                          }`}
                        >
                          {goalCd.text}
                        </span>
                        <span className="text-[10px] text-zinc-600 uppercase">{goalCd.overdue ? "overdue" : "remaining"}</span>
                      </div>
                      {isAdmin && <Pencil size={12} className="text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">{fmtDateTime(goal.deadline)}</div>
                  </div>
                ) : isAdmin ? (
                  <button
                    onClick={() => setShowDeadlineInput(true)}
                    className="w-full p-3 border border-dashed border-zinc-800 text-zinc-700 hover:border-emerald-500/30 hover:text-emerald-400 text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-2"
                  >
                    <Timer size={12} /> Add deadline
                  </button>
                ) : (
                  <div className="p-3 border border-zinc-800 text-zinc-700 text-sm italic">No deadline set</div>
                )}
              </div>

              <GoalReminders goal={goal} onChange={(reminders) => patch({ reminders })} />

              <DeviceReminders adminKey={adminKey} />

              <div className="text-[10px] text-zinc-800 font-mono pt-2">REF_{goal.id}</div>
            </div>
          )}
        </motion.div>

        {/* A small pill outside the window, so it never covers the list: in
            the gap above it on a phone, under it on a computer. */}
        {typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {lastDeleted && isAdmin && (
                <motion.div
                  key={lastDeleted.sub.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  role="status"
                  className="fixed left-1/2 -translate-x-1/2 top-4 md:top-auto md:bottom-14 z-[700] flex items-center gap-1 pl-4 pr-1 py-1 rounded-full bg-zinc-900/95 backdrop-blur border border-zinc-700 shadow-2xl shadow-black/70 text-xs font-mono overflow-hidden"
                >
                  <Trash2 size={12} className="text-zinc-500" />
                  <span className="text-zinc-400 pl-1.5 pr-2 whitespace-nowrap">Deleted</span>
                  <button
                    onClick={undoDelete}
                    className="px-3 py-1.5 rounded-full text-emerald-400 font-bold uppercase tracking-wider hover:bg-emerald-500/10 transition-colors"
                  >
                    Undo
                  </button>
                  {/* the five seconds running out */}
                  <motion.span
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: 5, ease: "linear" }}
                    className="absolute left-0 bottom-0 h-[2px] w-full origin-left bg-emerald-500/40"
                  />
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}

        {/* footer */}
        {isAdmin && (
          <div className="p-4 md:p-5 border-t border-zinc-800 space-y-2.5 shrink-0 bg-[#0a0a0a]">
            {tab !== "info" && tab === "tasks" && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="$ add a to-do..."
                  value={newSubgoal}
                  onChange={(e) => setNewSubgoal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSubgoal()}
                  className="flex-1 min-w-0 bg-black border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500/50 text-zinc-300 placeholder:text-zinc-700 font-mono"
                />
                <button
                  onClick={addSubgoal}
                  aria-label="Add to-do"
                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors font-mono text-sm"
                >
                  [+]
                </button>
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] font-bold font-mono uppercase tracking-wider">
              <span className={sync[syncState].cls}>{sync[syncState].text}</span>
              {syncState === "error" ? (
                <button onClick={onRetrySync} className="text-red-400 hover:text-red-300 underline underline-offset-2">
                  Retry now
                </button>
              ) : syncState === "rejected" ? (
                // Retrying with the same key is refused again. Kept here, it
                // sends itself once the key is put right.
                <span className="text-red-400/80 text-right">Lock, re-enter key, unlock</span>
              ) : (
                <span className="text-zinc-800">Saves by itself</span>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
