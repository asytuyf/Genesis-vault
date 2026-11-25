"use client";

// Background saving for goals.
//
// What it guarantees:
//   * A change is queued and sent within half a second. There is no save button
//     to forget and nothing is lost by closing the goal window.
//   * Closing the tab or switching apps flushes the queue with a keepalive
//     request, which the browser finishes after the page is gone.
//   * Anything still unsent is kept in localStorage and replayed on the next
//     visit, so an edit made with no signal survives.
//   * Each change is an operation on one goal, so a write can never wipe edits
//     made on another device.
//   * The list is refetched when the page regains focus and every 45 seconds
//     while visible, so a second device shows fresh data.
//   * A key the server refuses is reported as such ("rejected"), not as a
//     network hiccup that a retry could fix. The unsent work stays on the
//     device and goes by itself once admin mode is unlocked with the right key.

import { useCallback, useEffect, useRef, useState } from "react";
import { applyOps, type Goal, type GoalOp } from "@/lib/goals";
import { READ_TIMEOUT_MS, SAVE_TIMEOUT_MS, backoff, fetchWithTimeout, onNetworkChange } from "@/lib/net";

/**
 * "stale": nothing is waiting to be sent, but the last refresh failed (no
 * signal, a captive portal), so what is shown may be out of date. It retries
 * by itself and clears on the next good reply.
 */
export type SyncState = "synced" | "syncing" | "unsaved" | "error" | "rejected" | "stale";

const OUTBOX_KEY = "goals_outbox_v1";
const FLUSH_DELAY = 400;
const POLL_MS = 45000;
const REFRESH_THROTTLE = 3000;
// Browsers cap keepalive request bodies at 64 KB.
const KEEPALIVE_MAX = 60000;

const post = (body: string, keepalive: boolean, controller?: AbortController) =>
  fetchWithTimeout(
    "/api/goals",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive,
      cache: "no-store",
    },
    SAVE_TIMEOUT_MS,
    controller
  );

/**
 * The admin key as stored on this device, read straight from localStorage.
 *
 * The first request has to carry the key, otherwise the server answers without
 * the private goals and they only appear after a second round trip. React state
 * is not set yet at that point, so it is read here instead of waited for.
 * Locked means no key, so the private ones never reach the browser at all.
 */
const storedKey = (): string => {
  try {
    if (window.localStorage.getItem("goals_admin_mode") !== "1") return "";
    return window.localStorage.getItem("goals_admin_key") || "";
  } catch {
    return "";
  }
};

/**
 * @param password the admin key, used to save changes
 * @param unlocked whether admin mode is on; only then are private goals asked for
 */
export function useGoalSync(password: string, unlocked = true) {
  // Display order: newest first, matching how the page has always shown goals.
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("synced");

  const serverRef = useRef<Goal[]>([]); // last list confirmed by the server (storage order)
  const pendingRef = useRef<GoalOp[]>([]); // queued, not sent yet
  const inflightRef = useRef<GoalOp[] | null>(null); // sent, awaiting a reply
  const failedRef = useRef(false);
  // The server refused the admin key this device holds.
  const rejectedRef = useRef(false);
  const retryRef = useRef(0);
  const versionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => void>(() => {});
  const passwordRef = useRef(password);
  // What the GET sends. Empty while locked, so a locked app is served the same
  // list as any visitor.
  const authRef = useRef("");
  // The save on its way, so one stuck since before the app went away, or
  // since the network changed, can be cut short and sent again.
  const inflightAbortRef = useRef<AbortController | null>(null);
  const inflightSinceRef = useRef(0);
  // The last refresh failed: what is shown may be out of date.
  const staleRef = useRef(false);
  const refreshFailsRef = useRef(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshRef = useRef<() => void>(() => {});


  const saveOutbox = useCallback(() => {
    const ops = [...(inflightRef.current ?? []), ...pendingRef.current];
    try {
      if (ops.length) window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(ops));
      else window.localStorage.removeItem(OUTBOX_KEY);
    } catch {
      // Storage full or blocked: the in-memory queue still runs.
    }
  }, []);

  /** Recompute what the page shows: server truth plus everything not yet confirmed. */
  const publish = useCallback(() => {
    const ops = [...(inflightRef.current ?? []), ...pendingRef.current];
    const next = [...applyOps(serverRef.current, ops)].reverse();
    setGoals((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    setSyncState(
      inflightRef.current
        ? "syncing"
        : rejectedRef.current
          ? "rejected"
          : pendingRef.current.length
          ? failedRef.current
            ? "error"
            : "unsaved"
          : staleRef.current
            ? "stale"
            : "synced"
    );
  }, []);

  const schedule = useCallback((delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flushRef.current();
    }, delay);
  }, []);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (inflightRef.current) return; // the reply will start the next flush
    const pw = passwordRef.current;
    if (!pw || pendingRef.current.length === 0) return;

    const ops = pendingRef.current;
    pendingRef.current = [];
    inflightRef.current = ops;
    publish();

    const body = JSON.stringify({ password: pw, ops });
    try {
      const controller = new AbortController();
      inflightAbortRef.current = controller;
      inflightSinceRef.current = Date.now();
      const res = await post(body, body.length < KEEPALIVE_MAX, controller);
      // A refused request (wrong admin key, bad payload) will be refused again:
      // keep the work queued, show the error, and wait for a manual retry, or
      // for the key to be put right.
      if (res.status >= 400 && res.status < 500) {
        pendingRef.current = [...(inflightRef.current ?? []), ...pendingRef.current];
        inflightRef.current = null;
        failedRef.current = true;
        rejectedRef.current = res.status === 401;
        saveOutbox();
        publish();
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data?.goals)) {
        serverRef.current = data.goals;
        versionRef.current += 1;
        // The reply is the whole list: fresh, whatever the last refresh said.
        staleRef.current = false;
      }
      inflightRef.current = null;
      failedRef.current = false;
      rejectedRef.current = false;
      retryRef.current = 0;
      saveOutbox();
      publish();
      if (pendingRef.current.length) schedule(0);
    } catch {
      // Operations are idempotent, so requeueing them is always safe.
      pendingRef.current = [...(inflightRef.current ?? []), ...pendingRef.current];
      inflightRef.current = null;
      failedRef.current = true;
      saveOutbox();
      publish();
      retryRef.current = Math.min(retryRef.current + 1, 5);
      schedule(Math.min(30000, 1500 * 2 ** (retryRef.current - 1)));
    }
  }, [publish, saveOutbox, schedule]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  /** Last chance before the page goes away: send everything, confirmation optional. */
  const flushBeforeUnload = useCallback(() => {
    const pw = passwordRef.current;
    const ops = [...(inflightRef.current ?? []), ...pendingRef.current];
    if (!pw || ops.length === 0) return;
    const body = JSON.stringify({ password: pw, ops });
    if (body.length > KEEPALIVE_MAX) {
      flushRef.current();
      return;
    }
    // The queue is deliberately left in place: if this request never lands, the
    // outbox replays it on the next visit.
    post(body, true).catch(() => {});
  }, []);

  const refresh = useCallback(
    async (initial = false) => {
      const version = versionRef.current;
      try {
        // On the very first load React state is still empty, so fall back to
        // what this device already has saved.
        const key = initial ? authRef.current || storedKey() : authRef.current;
        const res = await fetchWithTimeout(
          "/api/goals",
          {
            cache: "no-store",
            // Private goals and notes come back only for a request with the key.
            headers: key ? { "x-admin-key": key } : undefined,
          },
          READ_TIMEOUT_MS
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Sent with a key the server did not accept: say so now, before the
        // first save bounces, rather than quietly showing the public list.
        const refused = !!key && res.headers.get("x-admin-key-rejected") === "1";
        if (refused !== rejectedRef.current) {
          rejectedRef.current = refused;
          publish();
        }
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Unexpected payload");
        // A save landed while this was in flight: its reply is the fresher truth.
        if (versionRef.current === version && !inflightRef.current) {
          serverRef.current = data;
          versionRef.current += 1;
          publish();
        }
        setLoadFailed(false);
        refreshFailsRef.current = 0;
        if (staleRef.current) {
          staleRef.current = false;
          publish();
        }
      } catch {
        if (initial) setLoadFailed(true);
        // Keep what is shown, say it may be old, and try again shortly.
        staleRef.current = true;
        publish();
        refreshFailsRef.current += 1;
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
          refreshTimerRef.current = null;
          if (document.visibilityState === "visible") refreshRef.current();
        }, backoff(refreshFailsRef.current));
      } finally {
        if (initial) setLoading(false);
      }
    },
    [publish]
  );

  useEffect(() => {
    refreshRef.current = () => void refresh();
  }, [refresh]);

  // Entering the key, or locking and unlocking, changes what the server sends.
  // Unlocking with a different key (it was checked on the way) also sends
  // whatever the old one had refused.
  const lastKeyRef = useRef<string | null>(null);
  useEffect(() => {
    passwordRef.current = password;
    const key = unlocked ? password : "";
    authRef.current = key;
    if (lastKeyRef.current !== null && lastKeyRef.current !== key) {
      refresh();
      if (key && failedRef.current && pendingRef.current.length) {
        retryRef.current = 0;
        schedule(0);
      }
    }
    lastKeyRef.current = key;
  }, [password, unlocked, refresh, schedule]);

  const queueOps = useCallback(
    (ops: GoalOp[]) => {
      if (!ops.length || !passwordRef.current) return;
      pendingRef.current = [...pendingRef.current, ...ops];
      failedRef.current = false;
      saveOutbox();
      publish();
      schedule(FLUSH_DELAY);
    },
    [publish, saveOutbox, schedule]
  );

  const retrySync = useCallback(() => {
    retryRef.current = 0;
    failedRef.current = false;
    rejectedRef.current = false;
    publish();
    schedule(0);
  }, [publish, schedule]);

  // First load: replay anything left over, then fetch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OUTBOX_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length) pendingRef.current = saved;
      }
    } catch {
      // Ignore a corrupt outbox.
    }
    refresh(true).then(() => {
      if (pendingRef.current.length) schedule(0);
    });
  }, [refresh, schedule]);

  // Stay fresh while visible, and never leave with unsent work.
  useEffect(() => {
    let lastRefresh = Date.now();

    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefresh < REFRESH_THROTTLE) return;
      lastRefresh = now;
      refresh();
    };

    // A save older than this when the app comes back, or the network changes,
    // was most likely sent on a connection that is gone.
    const cutStuckSave = () => {
      if (inflightRef.current && Date.now() - inflightSinceRef.current > 8000) inflightAbortRef.current?.abort();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushBeforeUnload();
      } else {
        cutStuckSave();
        maybeRefresh();
        if (pendingRef.current.length) schedule(0);
      }
    };

    // Back online, or on another network: drop a save that may be stuck on the
    // old one, fetch fresh, and send what is waiting.
    const onNetwork = () => {
      cutStuckSave();
      refresh();
      if (pendingRef.current.length) schedule(0);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushBeforeUnload);
    window.addEventListener("focus", maybeRefresh);
    const stopNetwork = onNetworkChange(onNetwork);
    const poll = setInterval(maybeRefresh, POLL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushBeforeUnload);
      window.removeEventListener("focus", maybeRefresh);
      stopNetwork();
      clearInterval(poll);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [flushBeforeUnload, refresh, schedule]);

  return { goals, loading, loadFailed, syncState, queueOps, retrySync, refresh };
}
