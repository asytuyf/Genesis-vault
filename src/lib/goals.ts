// Shared goal / sub-task types, formatting helpers, and the operation model
// used to save changes.
//
// DATA SAFETY: every field added to SubGoal after `completed` is optional, and
// every write is expressed as a small operation that touches one goal (or one
// sub-task) instead of overwriting the whole list. Untouched tasks are never
// rewritten, so nothing can be lost by a stale tab on another device.

export interface SubTimer {
  /** Total time-box length in seconds. */
  duration: number;
  /** Seconds left when the timer was last paused (equals `duration` before the first start). */
  remaining: number;
  /** ISO timestamp of the last start. Absent while paused or finished. */
  startedAt?: string;
}

/** A stretch of time set aside for a sub-task, such as 14:00 to 18:00 on one day. */
export interface SubSlot {
  /** datetime-local string. */
  start: string;
  /** datetime-local string, after `start`: on the next day for a slot that runs past midnight. */
  end: string;
}

export interface SubGoal {
  id: string;
  text: string;
  completed: boolean;
  /** When it was ticked off. Finished sub-tasks clear themselves a day later. */
  completedAt?: string;
  /** Currently being worked on. */
  active?: boolean;
  /** Optional per-sub-task deadline (datetime-local string). */
  deadline?: string;
  /** Optional time-box countdown. */
  timer?: SubTimer;
  /** Hidden, like a private goal, from anyone without the admin key. */
  private?: boolean;
  /** When it is planned to be worked on. */
  slot?: SubSlot;
  /** Where the work happens: a doc, a repo, an app link. Kept from anyone without the admin key. */
  link?: string;
}

/** When to be reminded about this goal's sub-task deadlines. */
export interface ReminderSettings {
  enabled: boolean;
  /** Minutes before a sub-task is due; 0 means at the moment it is due. */
  offsets: number[];
}

export interface Goal {
  id: string;
  task: string;
  project: string;
  priority: string;
  date: string;
  deadline?: string;
  description?: string;
  completed?: boolean;
  /** Kept out of every response that does not carry the admin key. */
  private?: boolean;
  /** Absent means the defaults: on, an hour before and when it is due. */
  reminders?: ReminderSettings;
  subgoals?: SubGoal[];
}

// --- Operations -------------------------------------------------------------

export interface GoalPatch {
  task?: string;
  project?: string;
  priority?: string;
  /** Empty string removes the deadline. */
  deadline?: string;
  /** Empty string removes the description. */
  description?: string;
  completed?: boolean;
  private?: boolean;
  reminders?: ReminderSettings;
}

export type GoalOp =
  /** Create a goal (replaces one with the same id). */
  | { type: "add"; goal: Goal }
  /** Delete a goal. */
  | { type: "remove"; id: string }
  /** Set goal order, listed in storage order (oldest first). */
  | { type: "order"; ids: string[] }
  /** Change fields on one goal. */
  | { type: "patch"; id: string; set: GoalPatch }
  /** Create or replace one sub-task. */
  | { type: "sub"; id: string; sub: SubGoal }
  /** Delete one sub-task. */
  | { type: "subRemove"; id: string; subId: string }
  /** Set sub-task order within one goal. */
  | { type: "subOrder"; id: string; ids: string[] };

const isStr = (v: unknown): v is string => typeof v === "string";

/** Shape check for operations arriving over the network. */
export function isGoalOp(op: unknown): op is GoalOp {
  if (!op || typeof op !== "object") return false;
  const o = op as Record<string, unknown>;
  switch (o.type) {
    case "add":
      return !!o.goal && typeof o.goal === "object" && isStr((o.goal as Goal).id);
    case "remove":
      return isStr(o.id);
    case "order":
      return Array.isArray(o.ids) && o.ids.every(isStr);
    case "patch":
      return isStr(o.id) && !!o.set && typeof o.set === "object";
    case "sub":
      return isStr(o.id) && !!o.sub && typeof o.sub === "object" && isStr((o.sub as SubGoal).id);
    case "subRemove":
      return isStr(o.id) && isStr(o.subId);
    case "subOrder":
      return isStr(o.id) && Array.isArray(o.ids) && o.ids.every(isStr);
    default:
      return false;
  }
}

/** Reorder `items` to follow `ids`; anything not listed keeps its place, at the end. */
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

/**
 * Apply operations to a goal list in storage order (oldest first).
 * Pure and total. Both the browser (optimistic view) and the API route (stored
 * truth) run it, so what you see and what is saved always agree.
 */
export function applyOps(list: Goal[], ops: GoalOp[]): Goal[] {
  let next = Array.isArray(list) ? [...list] : [];

  for (const op of ops) {
    if (!isGoalOp(op)) continue;

    if (op.type === "add") {
      const i = next.findIndex((g) => g.id === op.goal.id);
      if (i === -1) next.push(op.goal);
      else next[i] = op.goal;
      continue;
    }

    if (op.type === "remove") {
      next = next.filter((g) => g.id !== op.id);
      continue;
    }

    if (op.type === "order") {
      next = reorderById(next, op.ids);
      continue;
    }

    const i = next.findIndex((g) => g.id === op.id);
    // A goal deleted elsewhere stays deleted: edits to it are dropped.
    if (i === -1) continue;
    const goal = next[i];

    if (op.type === "patch") {
      const set = op.set;
      const g: Goal = { ...goal };
      if (isStr(set.task) && set.task.trim()) g.task = set.task.trim();
      if (isStr(set.project) && set.project.trim()) g.project = set.project.trim();
      if (isStr(set.priority) && set.priority.trim()) g.priority = set.priority.trim();
      if (isStr(set.deadline)) {
        if (set.deadline) g.deadline = set.deadline;
        else delete g.deadline;
      }
      if (isStr(set.description)) {
        const d = set.description.trim();
        if (d) g.description = d;
        else delete g.description;
      }
      if (typeof set.completed === "boolean") g.completed = set.completed;
      if (typeof set.private === "boolean") {
        if (set.private) g.private = true;
        else delete g.private;
      }
      if (set.reminders && typeof set.reminders === "object") {
        g.reminders = cleanReminders(set.reminders);
      }
      next[i] = g;
      continue;
    }

    const subs = [...(goal.subgoals ?? [])];

    if (op.type === "sub") {
      const j = subs.findIndex((s) => s.id === op.sub.id);
      if (j === -1) subs.push(op.sub);
      else subs[j] = op.sub;
      next[i] = { ...goal, subgoals: subs };
      continue;
    }

    if (op.type === "subRemove") {
      next[i] = { ...goal, subgoals: subs.filter((s) => s.id !== op.subId) };
      continue;
    }

    if (op.type === "subOrder") {
      next[i] = { ...goal, subgoals: reorderById(subs, op.ids) };
    }
  }

  return next;
}

// --- Reminders --------------------------------------------------------------

export const DEFAULT_REMINDERS: ReminderSettings = { enabled: true, offsets: [60, 0] };

/** Longest lead time accepted: 30 days. */
const MAX_OFFSET = 30 * 24 * 60;
const MAX_OFFSETS = 8;

/** Whole minutes, no duplicates, furthest first. */
export function cleanReminders(r: Partial<ReminderSettings>): ReminderSettings {
  const offsets = Array.isArray(r.offsets)
    ? [...new Set(
        r.offsets
          .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
          .map((n) => Math.round(n))
          .filter((n) => n >= 0 && n <= MAX_OFFSET)
      )]
        .sort((a, b) => b - a)
        .slice(0, MAX_OFFSETS)
    : DEFAULT_REMINDERS.offsets;
  return { enabled: r.enabled !== false, offsets };
}

export const reminderSettings = (goal: Goal): ReminderSettings => goal.reminders ?? DEFAULT_REMINDERS;

// --- Formatting -------------------------------------------------------------

export interface Countdown {
  text: string;
  urgent: boolean;
  overdue: boolean;
}

/** Human countdown to a deadline, e.g. "2d 4h", "35m", "3h overdue". */
export const formatCountdown = (deadline: string): Countdown => {
  const now = Date.now();
  const target = new Date(deadline).getTime();
  const diff = target - now;

  if (diff < 0) {
    const absDiff = Math.abs(diff);
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return { text: `${days}d ${hours}h overdue`, urgent: true, overdue: true };
    if (hours > 0) return { text: `${hours}h overdue`, urgent: true, overdue: true };
    return { text: "Just passed", urgent: true, overdue: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return { text: `${days}d ${hours}h`, urgent: days < 2, overdue: false };
  if (hours > 0) return { text: `${hours}h ${minutes}m`, urgent: hours < 6, overdue: false };
  return { text: `${minutes}m`, urgent: true, overdue: false };
};

/** Seconds left on a time-box right now (0 once it has finished). */
export const timerRemaining = (timer: SubTimer, now: number = Date.now()): number => {
  if (!timer.startedAt) return Math.max(0, timer.remaining);
  const elapsed = (now - new Date(timer.startedAt).getTime()) / 1000;
  return Math.max(0, timer.remaining - elapsed);
};

export const timerRunning = (timer?: SubTimer): boolean => !!timer?.startedAt && timerRemaining(timer) > 0;

export const timerFinished = (timer?: SubTimer): boolean => !!timer && timerRemaining(timer) <= 0;

/** Moment a running time-box runs out, in epoch ms. */
export const timerEndsAt = (timer: SubTimer): number =>
  timer.startedAt ? new Date(timer.startedAt).getTime() + timer.remaining * 1000 : 0;

/** "25:00", "1:05:09" -- clock style for a countdown. */
export const formatClock = (seconds: number): string => {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
};

/** "25m", "1h 30m", "2d 4h" -- short label for a duration. */
export const formatDuration = (seconds: number): string => {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
  }
  return rest ? `${h}h ${rest}m` : `${h}h`;
};

/** datetime-local value for now + N hours, in local time (not UTC). */
export const hoursFromNow = (hours: number): string => {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** How long a finished sub-task stays in the Done list before it clears itself. */
export const DONE_TTL_MS = 24 * 60 * 60 * 1000;

/** Moment a finished sub-task will be removed, in epoch ms, or 0 if it has no stamp yet. */
export const subClearsAt = (sub: SubGoal): number =>
  sub.completedAt ? Date.parse(sub.completedAt) + DONE_TTL_MS : 0;

/** "23h", "45m", "soon" -- how long a finished sub-task has left. */
export const formatTimeLeft = (ms: number): string => {
  if (ms <= 0) return "any moment";
  const hours = Math.floor(ms / 3600000);
  if (hours >= 1) return `${hours}h`;
  const minutes = Math.max(1, Math.round(ms / 60000));
  return `${minutes}m`;
};

/** Sub-tasks flagged as being worked on. */
export const activeSubgoals = (goal: Goal): SubGoal[] =>
  (goal.subgoals ?? []).filter((sg) => sg.active && !sg.completed);

/**
 * The to-do ticked or unticked. Finishing stops its timer, clears the
 * working-on flag, and starts the day it spends in the Done list.
 */
export const toggleSubDone = (sg: SubGoal): SubGoal => {
  const completed = !sg.completed;
  const next: SubGoal = { ...sg, completed };
  if (completed) {
    delete next.active;
    next.completedAt = new Date().toISOString();
    if (next.timer?.startedAt) {
      next.timer = { duration: next.timer.duration, remaining: timerRemaining(next.timer) };
    }
  } else {
    delete next.completedAt;
  }
  return next;
};

/** "2d 3h late" -- a softer way to say a due time has passed. */
export const lateText = (cd: Countdown): string => cd.text.replace("overdue", "late");

// --- Time slots -------------------------------------------------------------

const pad2 = (n: number) => String(n).padStart(2, "0");

/** "2026-10-20" for the local day, not the UTC one. */
export const localDay = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** A slot from two clock times on one day. An end at or before the start is read as the next day. */
export const makeSlot = (day: string, from: string, to: string): SubSlot => {
  if (to > from) return { start: `${day}T${from}`, end: `${day}T${to}` };
  const next = new Date(`${day}T00:00`);
  next.setDate(next.getDate() + 1);
  return { start: `${day}T${from}`, end: `${localDay(next)}T${to}` };
};

/** Before the slot, inside it, or past it. */
export const slotState = (slot: SubSlot, now: number = Date.now()): "later" | "now" | "over" => {
  if (now < Date.parse(slot.start)) return "later";
  return now < Date.parse(slot.end) ? "now" : "over";
};

/** "14:00–18:00", with the day in front when it is not today: "Tomorrow 14:00–18:00", "Fri 09:00–11:00", "3 Nov 14:00–18:00". */
export const formatSlot = (slot: SubSlot, now: Date = new Date()): string => {
  const range = `${slot.start.slice(11, 16)}–${slot.end.slice(11, 16)}`;
  const day = new Date(`${slot.start.slice(0, 10)}T00:00`);
  const days = Math.round((day.getTime() - new Date(`${localDay(now)}T00:00`).getTime()) / 86400000);
  if (days === 0) return range;
  if (days === 1) return `Tomorrow ${range}`;
  if (days > 1 && days < 7) return `${day.toLocaleDateString([], { weekday: "short" })} ${range}`;
  return `${day.toLocaleDateString([], { day: "numeric", month: "short" })} ${range}`;
};

// --- Links ------------------------------------------------------------------

/**
 * A typed link made ready to open, or "" when it is not one: "github.com/me"
 * becomes "https://github.com/me". App links (vscode://, notion://, obsidian://)
 * are kept as they are; javascript:, data: and file: links never are.
 */
export const cleanLink = (raw: string): string => {
  const text = raw.trim();
  if (!text) return "";
  // A scheme is a word and a colon; "localhost:3000" is a host and a port.
  const full = /^[a-z][a-z0-9+.-]*:(?!\d)/i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(full);
    if (["javascript:", "data:", "vbscript:", "file:"].includes(url.protocol)) return "";
    const web = url.protocol === "http:" || url.protocol === "https:";
    if (web && !url.hostname.includes(".") && url.hostname !== "localhost") return "";
    return url.href;
  } catch {
    return "";
  }
};

/** "docs.google.com" for a web link, the scheme ("notion") for an app link. */
export const linkLabel = (href: string): string => {
  try {
    const url = new URL(href);
    return url.hostname.replace(/^www\./, "") || url.protocol.replace(":", "");
  } catch {
    return href;
  }
};

/**
 * The goal as someone without the admin key may see it: no private to-dos.
 * The server strips them before they leave, and the page does the same the
 * moment admin mode is locked.
 */
export const withoutPrivateSubs = (goal: Goal): Goal =>
  goal.subgoals?.some((sg) => sg.private)
    ? { ...goal, subgoals: goal.subgoals.filter((sg) => !sg.private) }
    : goal;

/**
 * The goal with its to-dos' links taken out. A link can open a private doc,
 * so, like a description, it only goes to someone with the admin key.
 */
export const withoutSubLinks = (goal: Goal): Goal =>
  goal.subgoals?.some((sg) => sg.link)
    ? {
        ...goal,
        subgoals: goal.subgoals.map((sg) => {
          if (!sg.link) return sg;
          const rest = { ...sg };
          delete rest.link;
          return rest;
        }),
      }
    : goal;
