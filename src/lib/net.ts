// Requests that give up instead of hanging.
//
// A phone that changes networks (walking out of wifi, eduroam handing over,
// a captive portal) can leave a request open with nothing on the other end.
// The browser may wait minutes before calling it failed, and a save stuck like
// that holds up every save after it. So each request gets a time limit, and
// can also be cut short from outside, e.g. when the app comes back to the
// front holding a request that was started before it went away.

/** Saves get a little longer than reads: they carry a body and do the work. */
export const SAVE_TIMEOUT_MS = 15000;
export const READ_TIMEOUT_MS = 12000;

/**
 * fetch, but aborted after `ms` or when `controller` is aborted. The limit
 * also covers reading the body: the timer is left running on purpose, and an
 * abort after the body is fully read does nothing.
 */
export function fetchWithTimeout(
  input: string,
  init: RequestInit,
  ms: number,
  controller: AbortController = new AbortController()
): Promise<Response> {
  setTimeout(() => controller.abort(), ms);
  return fetch(input, { ...init, signal: controller.signal });
}

/** Calls `onChange` when the device comes back online or switches network. */
export function onNetworkChange(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  // Wifi to mobile data and back, where the browser reports it (not Safari).
  const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
  connection?.addEventListener?.("change", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    connection?.removeEventListener?.("change", onChange);
  };
}

/** Next wait after `failures` failed attempts in a row: 3s, 6s, 12s… up to a minute. */
export const backoff = (failures: number): number => Math.min(60000, 3000 * 2 ** Math.max(0, failures - 1));
