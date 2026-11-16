// Ce fichier supprime l'ancien service worker (et ses copies en cache) des appareils qui l'ont déjà.
// L'app n'a plus besoin de service worker : les données demandent de toute façon une connexion.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => c.navigate(c.url));
    })()
  );
});
