"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isStandalone } from "@/lib/pwa-client";

const KEY = "pwa_last_page";
/** Older than this, a cold start shows the start page as usual. */
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Brings a home-screen app back to the page it was on.
 *
 * iOS does not keep a home-screen web app running: leave it for a minute (to
 * copy the admin key out of a password app, say) and it is often closed, and
 * opening it again starts over at its start page. Apps added before every page
 * had its own manifest, or added after moving around inside the site, start at
 * the homepage, so Money or Tasks came back as the homepage every time.
 *
 * So the page an installed app is on is remembered, and when the app starts
 * fresh at the homepage it goes straight back there. Only on the iPhone, where
 * every home-screen app keeps its own storage: on Android and desktop the apps
 * share it, and each already starts on its own page.
 */
export function AppResume() {
  const pathname = usePathname();
  const router = useRouter();

  // On a fresh launch only: a reload or a tap on HOME in the menu stays put.
  useEffect(() => {
    if (!isIosHomeScreenApp() || window.location.pathname !== "/") return;
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav && nav.type !== "navigate") return;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null") as { path?: string; at?: number } | null;
      if (!saved?.path || saved.path === "/" || !saved.path.startsWith("/") || saved.path.startsWith("//")) return;
      if (Date.now() - (saved.at ?? 0) > MAX_AGE_MS) return;
      router.replace(saved.path);
    } catch {
      // Unreadable storage only costs the resume.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isStandalone()) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ path: pathname + window.location.search, at: Date.now() }));
    } catch {
      // Private mode or full storage: nothing to remember with.
    }
  }, [pathname]);

  return null;
}

function isIosHomeScreenApp(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
