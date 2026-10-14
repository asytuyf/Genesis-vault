"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes the site installable and lets it open
 * without a signal. Only in a real build: a worker in development would serve
 * yesterday's code back to you.
 *
 * Also follows a tapped notification while the app is already open: on the
 * goals page the goal opens in place, anywhere else the app goes there.
 *
 * And keeps the installed app current. A home-screen app is rarely closed:
 * the phone just wakes the old page up, still running the code from the day it
 * was opened. So each time the app comes back to the front it asks the server
 * which build is live, and reloads itself when that is a newer one. Unsent
 * changes are kept on the device, so a reload loses nothing.
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
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {
        // An unavailable worker only costs the offline fallback.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    let lastCheck = 0;
    const checkForUpdate = async () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      if (Date.now() - lastCheck < 30_000) return;
      lastCheck = Date.now();
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { build } = (await res.json()) as { build?: string };
        if (!build || build === process.env.NEXT_PUBLIC_BUILD_ID) return;
        // Never pull the page out from under someone typing; the next return
        // to the app tries again.
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
          lastCheck = 0;
          return;
        }
        await navigator.serviceWorker.getRegistration().then((reg) => reg?.update()).catch(() => {});
        window.location.reload();
      } catch {
        // Offline or the server is busy: the app carries on as it is.
      }
    };
    const onVisible = () => void checkForUpdate();
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("load", register);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
