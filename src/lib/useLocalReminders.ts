"use client";

// Sub-task reminders from the open page, for a device that is not signed up
// for push (a desktop browser tab, or before reminders were turned on). A device
// that is signed up hears from the server instead, so it is skipped here to
// avoid every reminder arriving twice.

import { useEffect } from "react";
import type { Goal } from "@/lib/goals";
import { pickDue, reminderMessage } from "@/lib/reminders";
import { deviceStatus, showLocalNotification } from "@/lib/push";

const SENT_KEY = "reminders_local_sent_v1";
const SENT_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const TICK_MS = 30000;

const readSent = (): Record<string, number> => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SENT_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export function useLocalReminders(goals: Goal[], enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("Notification" in window)) return;

    const tick = async () => {
      if (Notification.permission !== "granted") return;
      if ((await deviceStatus().catch(() => "unsupported")) === "on") return;

      const now = Date.now();
      const sent = readSent();
      const { send, skip } = pickDue(goals, now, (key) => key in sent);
      if (!send.length && !skip.length) return;

      for (const key of skip) sent[key] = now;
      for (const r of send) {
        sent[r.key] = now;
        const m = reminderMessage(r, now);
        showLocalNotification(m.title, { body: m.body, tag: m.tag, url: m.url }).catch(() => {});
      }
      for (const [key, t] of Object.entries(sent)) if (now - t > SENT_TTL_MS) delete sent[key];
      try {
        window.localStorage.setItem(SENT_KEY, JSON.stringify(sent));
      } catch {
        // Storage blocked: a reminder may repeat on the next visit, nothing worse.
      }
    };

    tick();
    const i = setInterval(tick, TICK_MS);
    return () => clearInterval(i);
  }, [goals, enabled]);
}
