"use client";

// Background saving for a list that is edited through small operations.
//
// What it guarantees:
//   * A change is queued and sent within half a second. There is no save button
//     to forget.
//   * Closing the tab or switching apps flushes the queue with a keepalive
//     request, which the browser finishes after the page is gone.
//   * Anything still unsent is kept in localStorage and replayed on the next
//     visit, so an edit made with no signal survives.
//   * Operations are applied to the stored list on the server, so a write can
//     never wipe edits made on another device.
//   * The list is refetched when the page regains focus and every 45 seconds
//     while visible, so a second device shows fresh data.
//   * A key the server refuses is reported as such ("rejected"). The unsent
//     work stays on the device and goes by itself once admin mode is unlocked
//     with the right key.
//
// Operations must be safe to send twice: say what a thing should become, never
// "flip it".

import { useCallback, useEffect, useRef, useState } from "react";
import { READ_TIMEOUT_MS, SAVE_TIMEOUT_MS, backoff, fetchWithTimeout, onNetworkChange } from "@/lib/net";

/**
 * "stale": nothing is waiting to be sent, but the last refresh failed (no
 * signal, a captive portal), so what is shown may be out of date. It retries
 * by itself and clears on the next good reply.
 */
export type SyncState = "synced" | "syncing" | "unsaved" | "error" | "rejected" | "stale";

const FLUSH_DELAY = 400;
const POLL_MS = 45000;
const REFRESH_THROTTLE = 3000;
// Browsers cap keepalive request bodies at 64 KB.
const KEEPALIVE_MAX = 60000;

interface Options<T, Op> {
  /** API route holding the list, e.g. "/api/habits". */
  endpoint: string;
  /** Applies operations the same way the server does, for the optimistic view. */
  apply: (items: T[], ops: Op[]) => T[];
  /** Field of the POST response that carries the saved list. */
  resultKey: string;
  /** Admin key. Without one, nothing is sent. */
  password: string;
  /** Admin mode is on, so the key has been checked. */
  unlocked?: boolean;
  /**
   * Send the admin key when reading too. Needed for lists the server refuses
   * to show at all without it, like money.
   */
  authReads?: boolean;
}

export function useOpSync<T, Op>({
  endpoint,
  apply,
  resultKey,
  password,
  unlocked = true,
  authReads = false,
}: Options<T, Op>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("synced");

  const serverRef = useRef<T[]>([]); // last list confirmed by the server
  const pendingRef = useRef<Op[]>([]); // queued, not sent yet
  const inflightRef = useRef<Op[] | null>(null); // sent, awaiting a reply
  const failedRef = useRef(false);
  // The server refused the admin key this device holds.
  const rejectedRef = useRef(false);
  const retryRef = useRef(0);
  const versionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => void>(() => {});
  const passwordRef = useRef(password);
  // The key a read may use: empty while locked.
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
  const applyRef = useRef(apply);
  applyRef.current = apply;

  const outboxKey = `opsync_outbox:${endpoint}`;

  const saveOutbox = useCallback(() => {
    const ops = [...(inflightRef.current ?? []), ...pendingRef.current];
    try {
      if (ops.length) window.localStorage.setItem(outboxKey, JSON.stringify(ops));
      else window.localStorage.removeItem(outboxKey);
    } catch {
      // Storage full or blocked: the in-memory queue still runs.
    }
  }, [outboxKey]);

  /** Recompute what the page shows: server truth plus everything not yet confirmed. */
  const publish = useCallback(() => {
    const ops = [...(inflightRef.current ?? []), ...pendingRef.current];
    const next = applyRef.current(serverRef.current, ops);
    setItems((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    setSyncState(
      inflightRef.current
        ? "syncing"
        : rejectedRef.current && pendingRef.current.length
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
      const res = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: body.length < KEEPALIVE_MAX,
          cache: "no-store",
        },
        SAVE_TIMEOUT_MS,
        controller
      );
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
      if (Array.isArray(data?.[resultKey])) {
        serverRef.current = data[resultKey];
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
      // Operations are safe to send again, so requeueing them is always safe.
      pendingRef.current = [...(inflightRef.current ?? []), ...pendingRef.current];
      inflightRef.current = null;
      failedRef.current = true;
      saveOutbox();
      publish();
      retryRef.current = Math.min(retryRef.current + 1, 5);
      schedule(Math.min(30000, 1500 * 2 ** (retryRef.current - 1)));
    }
  }, [endpoint, publish, resultKey, saveOutbox, schedule]);

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
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [endpoint]);

  const refresh = useCallback(
    async (initial = false) => {
      const version = versionRef.current;
      try {
        const key = authReads ? authRef.current : "";
        // A read that needs the key is pointless without one: skip it rather
        // than take a 401 and show a load failure.
        if (authReads && !key) {
          if (initial) setLoading(false);
          return;
        }
        const res = await fetchWithTimeout(
          endpoint,
          { cache: "no-store", headers: key ? { "x-admin-key": key } : undefined },
          READ_TIMEOUT_MS
        );
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
    [authReads, endpoint, publish]
  );

  useEffect(() => {
    refreshRef.current = () => void refresh();
  }, [refresh]);

  // The key both saves changes and, for a private list, unlocks reading it.
  // Locking clears it, so a locked page asks for nothing it may not see.
  const lastKeyRef = useRef<string | null>(null);
  useEffect(() => {
    passwordRef.current = password;
    const key = unlocked ? password : "";
    authRef.current = key;
    if (lastKeyRef.current !== null && lastKeyRef.current !== key) {
      // A private list is fetched with the key, so a different key means a
      // different answer.
      if (authReads) refresh();
      // Unlocking with a key that works sends whatever the old one could not.
      if (key && failedRef.current && pendingRef.current.length) {
        retryRef.current = 0;
        schedule(0);
      }
    }
    lastKeyRef.current = key;
  }, [authReads, password, refresh, schedule, unlocked]);

  const queueOps = useCallback(
    (ops: Op[]) => {
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
      const raw = window.localStorage.getItem(outboxKey);
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
  }, [outboxKey, refresh, schedule]);

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

  return { items, loading, loadFailed, syncState, queueOps, retrySync, refresh };
}
