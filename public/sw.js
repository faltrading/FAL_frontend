const CACHE_NAME = "fal-v2";
const STATIC_ASSETS = ["/", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept cross-origin requests (API gateway, Jitsi, etc.)
  // Let them pass through directly to avoid CORS issues
  if (url.origin !== self.location.origin) return;

  // Don't intercept API routes even on same origin
  if (url.pathname.startsWith("/api")) return;

  // Never cache _next/static assets — they are content-hashed and managed
  // by the browser HTTP cache. Caching them in the SW causes stale chunk
  // errors after every redeployment.
  if (url.pathname.startsWith("/_next/")) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
      return cached || fetched.catch(() =>
        caches.match("/offline").then((r) => r || new Response("Offline", { status: 503 }))
      );
    })
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "FAL Trading", body: "New notification", url: "/" };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const tag = data.tag || "fal-default";

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      vibrate: [200, 100, 200],
      tag: tag,
      renotify: true,
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).pathname === url && "focus" in client) {
          return client.focus();
        }
      }
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
