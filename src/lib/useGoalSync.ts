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

import { useCallback, useEffect, useRef, useState } from "react";
import { applyOps, type Goal, type GoalOp } from "@/lib/goals";

export type SyncState = "synced" | "syncing" | "unsaved" | "error";

const OUTBOX_KEY = "goals_outbox_v1";
const FLUSH_DELAY = 400;
const POLL_MS = 45000;
const REFRESH_THROTTLE = 3000;
// Browsers cap keepalive request bodies at 64 KB.
const KEEPALIVE_MAX = 60000;

const post = (body: string, keepalive: boolean) =>
  fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive,
    cache: "no-store",
  });

export function useGoalSync(password: string) {
  // Display order: newest first, matching how the page has always shown goals.
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("synced");

  const serverRef = useRef<Goal[]>([]); // last list confirmed by the server (storage order)
  const pendingRef = useRef<GoalOp[]>([]); // queued, not sent yet
  const inflightRef = useRef<GoalOp[] | null>(null); // sent, awaiting a reply
  const failedRef = useRef(false);
  const retryRef = useRef(0);
  const versionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => void>(() => {});
  const passwordRef = useRef(password);

  useEffect(() => {
    passwordRef.current = password;
  }, [password]);

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
        : pendingRef.current.length
          ? failedRef.current
            ? "error"
            : "unsaved"
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
      const res = await post(body, body.length < KEEPALIVE_MAX);
      // A refused request (wrong admin key, bad payload) will be refused again:
      // keep the work queued, show the error, and wait for a manual retry.
      if (res.status >= 400 && res.status < 500) {
        pendingRef.current = [...(inflightRef.current ?? []), ...pendingRef.current];
        inflightRef.current = null;
        failedRef.current = true;
        saveOutbox();
        publish();
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data?.goals)) {
        serverRef.current = data.goals;
        versionRef.current += 1;
      }
      inflightRef.current = null;
      failedRef.current = false;
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
        const res = await fetch("/api/goals", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Unexpected payload");
        // A save landed while this was in flight: its reply is the fresher truth.
        if (versionRef.current === version && !inflightRef.current) {
          serverRef.current = data;
          versionRef.current += 1;
          publish();
        }
        setLoadFailed(false);
      } catch {
        if (initial) setLoadFailed(true);
      } finally {
        if (initial) setLoading(false);
      }
    },
    [publish]
  );

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

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushBeforeUnload();
      } else {
        maybeRefresh();
        if (pendingRef.current.length) schedule(0);
      }
    };

    const onOnline = () => {
      if (pendingRef.current.length) schedule(0);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushBeforeUnload);
    window.addEventListener("focus", maybeRefresh);
    window.addEventListener("online", onOnline);
    const poll = setInterval(maybeRefresh, POLL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushBeforeUnload);
      window.removeEventListener("focus", maybeRefresh);
      window.removeEventListener("online", onOnline);
      clearInterval(poll);
    };
  }, [flushBeforeUnload, refresh, schedule]);

  return { goals, loading, loadFailed, syncState, queueOps, retrySync, refresh };
}
