"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes the site installable and lets it open
 * without a signal. Only in a real build: a worker in development would serve
 * yesterday's code back to you.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // An unavailable worker only costs the offline fallback.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
