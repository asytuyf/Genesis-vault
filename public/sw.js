// Service worker for the installed app.
//
// Rules, kept deliberately small:
//   * Data is never cached. Every /api request goes to the network, so a stale
//     goal or habit can never be shown.
//   * Build assets under /_next/static carry a hash in their name, so once
//     fetched they can be served from the cache forever.
//   * Pages are fetched from the network first and kept as a fallback, so
//     opening the app with no signal still shows the interface. What you do
//     there is queued by the app itself and sent when the signal returns.
//   * Sub-task reminders arrive as push messages and are shown even while the
//     app is closed. Tapping one opens the goal it is about.

const VERSION = "v1";
const CACHE = `genesis-${VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

const keep = async (request, response) => {
  if (!response || !response.ok || response.type !== "basic") return;
  const copy = response.clone();
  const cache = await caches.open(CACHE);
  await cache.put(request, copy);
};

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        event.waitUntil(keep(request, response));
        return response;
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        event.waitUntil(keep(request, response));
        return response;
      } catch (err) {
        const hit = await caches.match(request);
        if (hit) return hit;
        if (request.mode === "navigate") {
          const home = await caches.match("/goals");
          if (home) return home;
        }
        throw err;
      }
    })()
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Genesis Vault", {
      body: data.body || "",
      tag: data.tag,
      renotify: !!data.tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/goals" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/goals", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        await client.focus();
        // The goals page listens for this and opens the goal in place.
        client.postMessage({ type: "open-url", url: target });
        return;
      }
      await self.clients.openWindow(target);
    })()
  );
});
