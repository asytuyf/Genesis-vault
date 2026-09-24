"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes the site installable and lets it open
 * without a signal. Only in a real build: a worker in development would serve
 * yesterday's code back to you.
 *
 * Also follows a tapped notification while the app is already open: on the
 * goals page the goal opens in place, anywhere else the app goes there.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null;
      if (data?.type !== "open-url" || typeof data.url !== "string") return;
      const target = new URL(data.url, window.location.origin);
      if (target.origin !== window.location.origin) return;
      const goal = target.searchParams.get("goal");
      if (goal && window.location.pathname === target.pathname) {
        window.dispatchEvent(new CustomEvent("open-goal", { detail: goal }));
      } else {
        window.location.assign(target.href);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    if (process.env.NODE_ENV !== "production") {
      return () => navigator.serviceWorker.removeEventListener("message", onMessage);
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // An unavailable worker only costs the offline fallback.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
