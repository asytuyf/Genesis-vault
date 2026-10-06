"use client";

// Browser side of reminders: signing this device up for push, and showing a
// notification through the service worker (the only way an installed app on
// Android or iPhone is allowed to show one).

export type DeviceStatus =
  | "unsupported" // no service worker / push in this browser
  | "needs-install" // iPhone: only an app added to the home screen can receive push
  | "denied" // notifications blocked for this site
  | "off" // allowed or not asked yet, but this device is not signed up
  | "on"; // signed up

// This device was turned on at some point. Kept so the app can quietly put a
// subscription back if the browser drops it, instead of looking like the
// permission was forgotten and asking you to turn reminders on again.
const ENABLED_KEY = "push_enabled_v1";
const ENDPOINT_KEY = "push_endpoint_v1";

const remember = (endpoint: string) => {
  try {
    window.localStorage.setItem(ENABLED_KEY, "1");
    window.localStorage.setItem(ENDPOINT_KEY, endpoint);
  } catch {
    // Storage blocked: reminders still work, they just cannot self-heal.
  }
};

const forget = () => {
  try {
    window.localStorage.removeItem(ENABLED_KEY);
    window.localStorage.removeItem(ENDPOINT_KEY);
  } catch {
    // Nothing to do.
  }
};

const wasEnabled = () => {
  try {
    return window.localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
};

const knownEndpoint = () => {
  try {
    return window.localStorage.getItem(ENDPOINT_KEY) || "";
  } catch {
    return "";
  }
};

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/**
 * The worker, waiting briefly for it when the app has only just opened.
 * `getRegistration()` can answer "nothing here" in the first moments of a cold
 * start, which used to read as "this device is not signed up".
 */
async function existingRegistration(waitMs = 4000): Promise<ServiceWorkerRegistration | undefined> {
  if (!("serviceWorker" in navigator)) return undefined;
  const now = await navigator.serviceWorker.getRegistration();
  if (now) return now;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), waitMs)),
  ]);
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const existing = await existingRegistration();
  if (existing) return existing;
  // Only the production build registers the worker on load; in development
  // this is the one place that does, and only when you ask for reminders.
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

export async function deviceStatus(): Promise<DeviceStatus> {
  if (typeof window === "undefined") return "unsupported";
  if (!pushSupported()) return isIos() && !isStandalone() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await existingRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

/** Hand a subscription to the server. Harmless to repeat. */
async function saveSubscription(password: string, sub: PushSubscription): Promise<void> {
  const res = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      password,
      action: "subscribe",
      subscription: sub.toJSON(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  if (!res.ok) throw new Error(res.status === 401 ? "Admin key rejected." : "Could not save this device.");
  remember(sub.endpoint);
}

/**
 * Called on every start. If this device was turned on before and notifications
 * are still allowed, it makes sure a subscription exists and that the server
 * holds it, without ever prompting. Browsers do drop push subscriptions, and
 * iOS drops them when the app sits unused, which is what made reminders look
 * like they switched themselves off.
 */
export async function ensurePush(password: string): Promise<DeviceStatus> {
  if (typeof window === "undefined" || !password) return "off";
  if (!pushSupported() || Notification.permission !== "granted") return deviceStatus();

  const reg = await existingRegistration();
  if (!reg) return "off";

  let sub = await reg.pushManager.getSubscription();

  // A device signed up before this repair existed has a subscription but no
  // note of it. Adopt it, so it heals from here on.
  if (sub && !wasEnabled()) remember(sub.endpoint);

  if (!wasEnabled()) return sub ? "on" : "off";

  if (!sub) {
    const info = await fetch("/api/push", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);
    if (!info?.configured || !info.publicKey) return "off";
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(info.publicKey),
      });
    } catch {
      return "off";
    }
  }

  // Only talk to the server when it does not already know this subscription.
  if (sub.endpoint !== knownEndpoint()) {
    await saveSubscription(password, sub).catch(() => {});
  }
  return "on";
}

const base64UrlToBytes = (value: string) => {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
};

/** Ask for permission (must run from a tap) and sign this device up. */
export async function enablePush(password: string): Promise<DeviceStatus> {
  if (!pushSupported()) return deviceStatus();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const info = await fetch("/api/push", { cache: "no-store" }).then((r) => r.json());
  if (!info?.configured || !info.publicKey) throw new Error("Push is not set up on the server yet (VAPID keys missing).");

  const reg = await registration();
  if (!reg) return "unsupported";
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(info.publicKey),
      });
    } catch {
      throw new Error("This browser refused to sign up for push. Private windows cannot receive it.");
    }
  }

  await saveSubscription(password, sub);
  return "on";
}

export async function disablePush(password: string): Promise<DeviceStatus> {
  forget();
  const reg = await existingRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, action: "unsubscribe", endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe();
  }
  return deviceStatus();
}

export async function sendTestPush(password: string): Promise<{ sent: number; failed: number }> {
  const res = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, action: "test" }),
  });
  if (!res.ok) throw new Error(res.status === 503 ? "Push is not set up on the server yet." : "Test failed.");
  return res.json();
}

/** Show a notification now, through the service worker when there is one. */
export async function showLocalNotification(
  title: string,
  options: { body: string; tag?: string; url?: string; icon?: string }
): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const { url, icon, ...rest } = options;
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  if (reg) {
    await reg.showNotification(title, { ...rest, icon: icon ?? "/icon-192.png", data: { url: url ?? window.location.pathname + window.location.search } });
    return;
  }
  const n = new Notification(title, { ...rest, icon: icon ?? "/icon-192.png" });
  setTimeout(() => n.close(), 8000);
}
