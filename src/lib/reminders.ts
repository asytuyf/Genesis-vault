// Deadline reminders for sub-tasks, shared by the server (push) and the
// browser (the fallback that runs while the page is open).
//
// A reminder belongs to one sub-task deadline and one lead time. Its key holds
// the deadline itself, so moving a deadline arms fresh reminders instead of
// being swallowed by ones already sent for the old time.

import { reminderSettings, type Goal } from "@/lib/goals";

/** Past its moment, a reminder is still worth sending for this long after the deadline. */
const LATE_GRACE_MS = 60 * 60 * 1000;

export interface Reminder {
  key: string;
  goalId: string;
  subId: string;
  /** The goal's name. */
  goal: string;
  /** The sub-task's text. */
  sub: string;
  /** Minutes before the deadline. */
  offset: number;
  dueAt: number;
  fireAt: number;
}

export const reminderKey = (goalId: string, subId: string, deadline: string, offset: number) =>
  `${goalId}:${subId}:${deadline}:${offset}`;

// --- Time zones -------------------------------------------------------------
// Deadlines are stored as the wall-clock time typed into the browser
// ("2026-09-24T18:00") with no zone. The browser reads them in its own zone; the
// server has to be told which zone that was.

const zoneOffsetMs = (epoch: number, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(epoch));
  const p: Record<string, number> = {};
  for (const { type, value } of parts) p[type] = Number(value);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (epoch - (epoch % 1000));
};

/** Epoch ms for a stored deadline, read in `timeZone` (the local zone when absent). */
export function deadlineToEpoch(deadline: string, timeZone?: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(deadline);
  if (!m || !timeZone) return Date.parse(deadline);
  try {
    const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
    let epoch = wall - zoneOffsetMs(wall, timeZone);
    // Near a daylight-saving change the offset at the guess can be the wrong one.
    const again = zoneOffsetMs(epoch, timeZone);
    if (wall - again !== epoch) epoch = wall - again;
    return epoch;
  } catch {
    return Date.parse(deadline);
  }
}

// --- What is due ------------------------------------------------------------

/** Every reminder the goals ask for, sent or not. */
export function allReminders(goals: Goal[], timeZone?: string): Reminder[] {
  const out: Reminder[] = [];
  for (const g of goals) {
    if (g.completed) continue;
    const settings = reminderSettings(g);
    if (!settings.enabled) continue;
    for (const sg of g.subgoals ?? []) {
      if (sg.completed || !sg.deadline) continue;
      const dueAt = deadlineToEpoch(sg.deadline, timeZone);
      if (!Number.isFinite(dueAt)) continue;
      for (const offset of settings.offsets) {
        out.push({
          key: reminderKey(g.id, sg.id, sg.deadline, offset),
          goalId: g.id,
          subId: sg.id,
          goal: g.task,
          sub: sg.text,
          offset,
          dueAt,
          fireAt: dueAt - offset * 60000,
        });
      }
    }
  }
  return out;
}

/**
 * Reminders to send now. For each sub-task only the latest reminder that has
 * come due is sent; earlier ones it has passed are returned in `skip` so they
 * are marked as handled rather than sent late in a burst. That covers a
 * deadline set 30 minutes out with a one-hour reminder: you hear about it once,
 * right away, instead of never.
 */
export function pickDue(
  goals: Goal[],
  now: number,
  isSent: (key: string) => boolean,
  timeZone?: string
): { send: Reminder[]; skip: string[] } {
  const bySub = new Map<string, Reminder[]>();
  for (const r of allReminders(goals, timeZone)) {
    if (r.fireAt > now || now > r.dueAt + LATE_GRACE_MS) continue;
    const id = `${r.goalId}:${r.subId}`;
    bySub.set(id, [...(bySub.get(id) ?? []), r]);
  }

  const send: Reminder[] = [];
  const skip: string[] = [];
  for (const due of bySub.values()) {
    due.sort((a, b) => b.fireAt - a.fireAt);
    const [latest, ...older] = due;
    if (!isSent(latest.key)) send.push(latest);
    for (const r of older) if (!isSent(r.key)) skip.push(r.key);
  }
  return { send, skip };
}

// --- Wording ----------------------------------------------------------------

const span = (ms: number) => {
  const min = Math.round(Math.abs(ms) / 60000);
  if (min < 60) return `${Math.max(1, min)}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
};

/** "1h before", "At due time", "1d 2h before". */
export const formatOffset = (minutes: number) => (minutes === 0 ? "At due time" : `${span(minutes * 60000)} before`);

export interface ReminderMessage {
  title: string;
  body: string;
  tag: string;
  url: string;
}

/** The notification for a reminder: the goal is the title, the sub-task and time the body. */
export function reminderMessage(r: Reminder, now: number): ReminderMessage {
  const left = r.dueAt - now;
  const when = left > 60000 ? `due in ${span(left)}` : left > -60000 ? "due now" : `overdue by ${span(left)}`;
  return {
    title: r.goal,
    body: `${r.sub} · ${when}`,
    // One notification per sub-task: a later reminder replaces the earlier one.
    tag: `sub-${r.goalId}-${r.subId}`,
    url: `/goals?goal=${encodeURIComponent(r.goalId)}`,
  };
}
