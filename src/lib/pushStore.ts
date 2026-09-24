// Server-only: the devices that asked for reminders, the reminders already
// sent, and the Web Push sender.

import webpush from "web-push";
import { readKey, writeKey } from "@/lib/kv";

const PUSH_KEY = "push";
const SENT_KEY = "reminders_sent";
/** Sent reminders are remembered this long, well past any deadline grace. */
const SENT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  addedAt: string;
}

export interface PushState {
  /** Zone the deadlines were typed in, from the device that last turned reminders on. */
  timeZone?: string;
  subscriptions: StoredSubscription[];
}

export async function readPushState(): Promise<PushState> {
  const state = await readKey<PushState>(PUSH_KEY);
  return { timeZone: state?.timeZone, subscriptions: Array.isArray(state?.subscriptions) ? state.subscriptions : [] };
}

export const writePushState = (state: PushState) => writeKey(PUSH_KEY, state);

/** Keys of reminders already handled, pruned of old ones. */
export async function readSent(now: number): Promise<Record<string, number>> {
  const sent = (await readKey<Record<string, number>>(SENT_KEY)) ?? {};
  const fresh: Record<string, number> = {};
  for (const [k, t] of Object.entries(sent)) if (typeof t === "number" && now - t < SENT_TTL_MS) fresh[k] = t;
  return fresh;
}

export const writeSent = (sent: Record<string, number>) => writeKey(SENT_KEY, sent);

export const isSubscription = (v: unknown): v is StoredSubscription => {
  const s = v as StoredSubscription;
  return (
    !!s &&
    typeof s.endpoint === "string" &&
    s.endpoint.startsWith("https://") &&
    typeof s.keys?.p256dh === "string" &&
    typeof s.keys?.auth === "string"
  );
};

// --- Sending ----------------------------------------------------------------

export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || "";

export const pushConfigured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

/**
 * Send one message to every device. Devices the push service says are gone
 * (unsubscribed, app removed) are dropped from the list.
 * `origin` stands in for VAPID_SUBJECT when that is not set.
 */
export async function pushToAll(
  state: PushState,
  payload: object,
  origin: string
): Promise<{ sent: number; failed: number; state: PushState; changed: boolean }> {
  if (!pushConfigured()) throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not configured");

  const subject = process.env.VAPID_SUBJECT || (origin.startsWith("https://") ? origin : "mailto:reminders@localhost");
  webpush.setVapidDetails(subject, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

  const body = JSON.stringify(payload);
  const gone = new Set<string>();
  let sent = 0;
  let failed = 0;

  await Promise.all(
    state.subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, body, { TTL: 60 * 60, urgency: "high" });
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.add(sub.endpoint);
        else console.error("Push failed:", status, (err as Error).message);
        failed++;
      }
    })
  );

  if (!gone.size) return { sent, failed, state, changed: false };
  return {
    sent,
    failed,
    state: { ...state, subscriptions: state.subscriptions.filter((s) => !gone.has(s.endpoint)) },
    changed: true,
  };
}
