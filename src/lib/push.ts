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

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
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
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
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
  return "on";
}

export async function disablePush(password: string): Promise<DeviceStatus> {
  const reg = await navigator.serviceWorker?.getRegistration();
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
