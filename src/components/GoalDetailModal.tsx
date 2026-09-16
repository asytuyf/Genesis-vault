"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import {
  X, Tag, Clock, Activity, Timer, AlertTriangle, Pencil, Check, GripVertical,
  ChevronUp, ChevronDown, SlidersHorizontal, Play, Pause, RotateCcw, Hourglass,
  CalendarClock, Trash2, Lock,
} from "lucide-react";
import {
  type Goal, type GoalOp, type GoalPatch, type SubGoal,
  formatCountdown, formatClock, formatDuration, hoursFromNow,
  timerRemaining, timerRunning, timerFinished,
} from "@/lib/goals";
import { requestNotifPermission } from "@/lib/notify";
import type { SyncState } from "@/lib/useGoalSync";

// --- shared bits ------------------------------------------------------------

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700 mb-2">{children}</div>
);

const chip =
  "px-2.5 py-1 bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-[10px] font-bold uppercase transition-colors";
const chipHover = "hover:border-emerald-500/30 hover:text-emerald-400";

const TIMER_PRESETS = [5, 15, 25, 45, 60, 120];

const DEADLINE_PRESETS = [
  { label: "1h", hours: 1 },
  { label: "3h", hours: 3 },
  { label: "6h", hours: 6 },
  { label: "12h", hours: 12 },
  { label: "24h", hours: 24 },
  { label: "2d", hours: 48 },
  { label: "1w", hours: 168 },
];

const fmtDateTime = (iso: string, withYear = false) =>
  `${new Date(iso).toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  })} at ${new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;

// --- one sub-task -----------------------------------------------------------

interface SubgoalItemProps {
  sg: SubGoal;
  index: number;
  total: number;
  isAdmin: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onChange: (next: SubGoal) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onReorderEnd: () => void;
}

const SubgoalItem = ({
  sg, index, total, isAdmin, expanded, onToggleExpanded, onChange, onRemove, onMove, onReorderEnd,
}: SubgoalItemProps) => {
  const dragControls = useDragControls();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sg.text);
  const [customMin, setCustomMin] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

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
    const completed = !sg.completed;
    const next: SubGoal = { ...sg, completed };
    if (completed) {
      // Finishing stops the stopwatch and clears the working-on flag.
      delete next.active;
      if (next.timer?.startedAt) {
        next.timer = { duration: next.timer.duration, remaining: timerRemaining(next.timer) };
      }
    }
    onChange(next);
  };

  const toggleActive = () => {
    if (!isAdmin || sg.completed) return;
    const next: SubGoal = { ...sg };
    if (isActive) delete next.active;
    else next.active = true;
    onChange(next);
  };

  const setTimer = (minutes: number) => {
    const duration = Math.max(1, Math.round(minutes)) * 60;
    onChange({ ...sg, timer: { duration, remaining: duration } });
    setCustomMin("");
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

  const resetTimer = () => {
    if (!sg.timer) return;
    onChange({ ...sg, timer: { duration: sg.timer.duration, remaining: sg.timer.duration } });
  };

  const clearTimer = () => {
    const next = { ...sg };
    delete next.timer;
    onChange(next);
  };

  const setDeadline = (value: string) => {
    const next = { ...sg };
    if (value) next.deadline = value;
    else delete next.deadline;
    onChange(next);
  };

  return (
    <Reorder.Item
      value={sg}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onReorderEnd}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`group relative border transition-colors ${
        sg.completed
          ? "bg-zinc-900/30 border-zinc-800"
          : isActive
            ? "bg-amber-500/[0.04] border-zinc-800 hover:border-amber-500/30"
            : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
      }`}
    >
      {isActive && <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-amber-400 motion-safe:animate-pulse" />}

      <div className="flex items-start gap-2 p-2.5 pl-3">
        {isAdmin && (
          <div
            className="cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-400 transition-colors p-1 -ml-1 mt-0.5 touch-none select-none"
            onPointerDown={(e) => {
              e.preventDefault();
              dragControls.start(e);
            }}
            title="Drag to reorder"
          >
            <GripVertical size={14} />
          </div>
        )}

        <button
          onClick={toggleDone}
          disabled={!isAdmin}
          className={`font-mono text-sm mt-0.5 transition-colors ${isAdmin ? "cursor-pointer" : "cursor-default"}`}
          title={sg.completed ? "Mark as not done" : "Mark as done"}
        >
          <span className={sg.completed ? "text-emerald-500" : "text-zinc-700 hover:text-zinc-500"}>
            [{sg.completed ? <span className="text-emerald-400">■</span> : <span className="text-zinc-800">&nbsp;</span>}]
          </span>
        </button>

        <button
          onClick={toggleActive}
          disabled={!isAdmin || sg.completed}
          title={isActive ? "Stop working on this" : "Working on this"}
          aria-pressed={isActive}
          className={`mt-[7px] h-3 w-3 shrink-0 grid place-items-center ${
            isAdmin && !sg.completed ? "cursor-pointer" : "cursor-default"
          }`}
        >
          <span
            className={`block h-2 w-2 rounded-full transition-all ${
              isActive
                ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] motion-safe:animate-pulse"
                : sg.completed
                  ? "border border-zinc-800"
                  : "border border-zinc-700 group-hover:border-amber-500/60"
            }`}
          />
        </button>

        <div className="flex-1 min-w-0">
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
              className={`block text-sm font-mono break-words leading-snug py-0.5 ${
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
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : cd.urgent
                          ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                          : "bg-zinc-900/60 border-zinc-800 text-zinc-500"
                  }`}
                >
                  <CalendarClock size={9} />
                  {cd.text}
                </span>
              )}
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-0.5 -mr-1 shrink-0">
            <button
              onClick={() => onMove(-1)}
              disabled={index === 0}
              title="Move up"
              aria-label="Move up"
              className="p-1.5 text-zinc-700 hover:text-emerald-400 disabled:opacity-20 disabled:hover:text-zinc-700 transition-colors md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              title="Move down"
              aria-label="Move down"
              className="p-1.5 text-zinc-700 hover:text-emerald-400 disabled:opacity-20 disabled:hover:text-zinc-700 transition-colors md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            >
              <ChevronDown size={14} />
            </button>
            <button
              onClick={onToggleExpanded}
              title="Timer, deadline, delete"
              aria-label="Sub-task options"
              aria-expanded={expanded}
              className={`p-1.5 transition-colors ${expanded ? "text-emerald-400" : "text-zinc-700 hover:text-zinc-300"}`}
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
        )}
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
            <div className="border-t border-zinc-800/80 px-3 py-3 space-y-3 bg-black/40">
              <div>
                <Label>
                  <span className="inline-flex items-center gap-1.5">
                    <Hourglass size={9} /> Time-box
                  </span>
                </Label>
                <div className="flex flex-wrap gap-1">
                  {TIMER_PRESETS.map((min) => (
                    <button
                      key={min}
                      onClick={() => setTimer(min)}
                      className={`${chip} ${chipHover} ${
                        sg.timer?.duration === min * 60 ? "border-emerald-500/40 text-emerald-400" : ""
                      }`}
                    >
                      {formatDuration(min * 60)}
                    </button>
                  ))}
                  <div className="flex items-stretch">
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      placeholder="min"
                      value={customMin}
                      onChange={(e) => setCustomMin(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && Number(customMin) > 0) setTimer(Number(customMin));
                      }}
                      className="w-14 bg-black border border-zinc-800 border-r-0 px-2 py-1 text-[10px] font-mono text-zinc-300 outline-none focus:border-emerald-500/50 placeholder:text-zinc-700"
                    />
                    <button
                      onClick={() => Number(customMin) > 0 && setTimer(Number(customMin))}
                      className={`${chip} ${chipHover}`}
                    >
                      Set
                    </button>
                  </div>
                  {sg.timer && (
                    <>
                      <button onClick={resetTimer} className={`${chip} ${chipHover} inline-flex items-center gap-1`}>
                        <RotateCcw size={9} /> Reset
                      </button>
                      <button onClick={clearTimer} className={`${chip} hover:border-red-500/30 hover:text-red-400`}>
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div>
                <Label>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock size={9} /> Due
                  </span>
                </Label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {DEADLINE_PRESETS.map((p) => (
                    <button key={p.label} onClick={() => setDeadline(hoursFromNow(p.hours))} className={`${chip} ${chipHover}`}>
                      +{p.label}
                    </button>
                  ))}
                  {sg.deadline && (
                    <button onClick={() => setDeadline("")} className={`${chip} hover:border-red-500/30 hover:text-red-400`}>
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={sg.deadline || ""}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-black border border-zinc-800 px-3 py-2 text-xs outline-none focus:border-emerald-500/50 text-zinc-300 font-mono"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => (confirmDelete ? onRemove() : setConfirmDelete(true))}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[10px] font-bold uppercase transition-colors ${
                    confirmDelete
                      ? "border-red-500/60 text-red-400 bg-red-500/10"
                      : "border-zinc-800 text-zinc-600 hover:border-red-500/40 hover:text-red-400"
                  }`}
                >
                  <Trash2 size={10} /> {confirmDelete ? "Tap again to delete" : "Delete sub-task"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
};

// --- the goal window --------------------------------------------------------

interface GoalDetailModalProps {
  goal: Goal;
  isAdmin: boolean;
  syncState: SyncState;
  onOps: (ops: GoalOp[]) => void;
  onRetrySync: () => void;
  onClose: () => void;
}

export const GoalDetailModal = ({ goal, isAdmin, syncState, onOps, onRetrySync, onClose }: GoalDetailModalProps) => {
  const [tab, setTab] = useState<"tasks" | "info">("tasks");
  const subgoals = useMemo(() => goal.subgoals ?? [], [goal.subgoals]);

  // While a drag is in progress the list follows the pointer; the new order is
  // saved once, on drop.
  const [dragOrder, setDragOrder] = useState<SubGoal[] | null>(null);
  const dragOrderRef = useRef<SubGoal[] | null>(null);
  const list = dragOrder ?? subgoals;

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
  const [, tick] = useState(0);
  useEffect(() => {
    if (!anyRunning) return;
    const i = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, [anyRunning]);

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

  const moveSubgoal = (id: string, dir: -1 | 1) => {
    const from = subgoals.findIndex((sg) => sg.id === id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= subgoals.length) return;
    const ids = subgoals.map((sg) => sg.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    onOps([{ type: "subOrder", id: goal.id, ids }]);
  };

  const commitDragOrder = () => {
    const dragged = dragOrderRef.current;
    dragOrderRef.current = null;
    setDragOrder(null);
    if (!dragged || !isAdmin) return;
    const ids = dragged.map((sg) => sg.id);
    const current = subgoals.map((sg) => sg.id);
    if (ids.length === current.length && ids.every((id, i) => id === current[i])) return;
    onOps([{ type: "subOrder", id: goal.id, ids }]);
  };

  const addSubgoal = () => {
    const text = newSubgoal.trim();
    if (!text || !isAdmin) return;
    onOps([{ type: "sub", id: goal.id, sub: { id: Date.now().toString(), text, completed: false } }]);
    setNewSubgoal("");
  };

  const removeSubgoal = (subId: string) => {
    if (!isAdmin) return;
    setExpandedId(null);
    onOps([{ type: "subRemove", id: goal.id, subId }]);
  };

  const done = subgoals.filter((sg) => sg.completed).length;
  const progress = subgoals.length ? (done / subgoals.length) * 100 : 0;
  const activeCount = subgoals.filter((sg) => sg.active && !sg.completed).length;
  const goalCd = goal.deadline ? formatCountdown(goal.deadline) : null;

  const sync: Record<SyncState, { text: string; cls: string }> = {
    synced: { text: "● SYNCED", cls: "text-emerald-600" },
    syncing: { text: "◌ SYNCING", cls: "text-amber-400 motion-safe:animate-pulse" },
    unsaved: { text: "○ QUEUED", cls: "text-zinc-500" },
    error: { text: "! UNSENT_KEPT_ON_DEVICE", cls: "text-red-400" },
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
                { key: "tasks", label: "Tasks", meta: subgoals.length ? `${done}/${subgoals.length}` : "" },
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
              {subgoals.length > 0 && (
                <div className="mb-5">
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                    <span className="text-zinc-600">Progress</span>
                    <span className={done === subgoals.length ? "text-emerald-400" : "text-zinc-500"}>
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
                  No_Sub-Tasks_Found
                  {isAdmin && <div className="mt-2 text-[10px] text-zinc-800 normal-case">Add the first one below.</div>}
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={list}
                  onReorder={(next: SubGoal[]) => {
                    if (!isAdmin) return;
                    dragOrderRef.current = next;
                    setDragOrder(next);
                  }}
                  className="space-y-1"
                >
                  <AnimatePresence initial={false}>
                    {list.map((sg, i) => (
                      <SubgoalItem
                        key={sg.id}
                        sg={sg}
                        index={i}
                        total={list.length}
                        isAdmin={isAdmin}
                        expanded={expandedId === sg.id}
                        onToggleExpanded={() => setExpandedId((cur) => (cur === sg.id ? null : sg.id))}
                        onChange={changeSubgoal}
                        onRemove={() => removeSubgoal(sg.id)}
                        onMove={(dir) => moveSubgoal(sg.id, dir)}
                        onReorderEnd={commitDragOrder}
                      />
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              )}

              {isAdmin && subgoals.length > 1 && (
                <div className="mt-3 text-[9px] text-zinc-800 uppercase tracking-wider">
                  <span className="md:hidden">Arrows move a task up or down</span>
                  <span className="hidden md:inline">Drag the grip, or use the arrows, to reorder</span>
                </div>
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

              <div className="text-[10px] text-zinc-800 font-mono pt-2">REF_{goal.id}</div>
            </div>
          )}
        </motion.div>

        {/* footer */}
        {isAdmin && (
          <div className="p-4 md:p-5 border-t border-zinc-800 space-y-2.5 shrink-0 bg-[#0a0a0a]">
            {tab === "tasks" && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="$ add sub-task..."
                  value={newSubgoal}
                  onChange={(e) => setNewSubgoal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSubgoal()}
                  className="flex-1 min-w-0 bg-black border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500/50 text-zinc-300 placeholder:text-zinc-700 font-mono"
                />
                <button
                  onClick={addSubgoal}
                  aria-label="Add sub-task"
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
