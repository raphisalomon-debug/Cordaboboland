// Service worker minimal : l'app s'ouvre vite et garde son écran même sans réseau.
// - /api/* n'est JAMAIS mis en cache (les données doivent toujours être à jour).
// - Fichiers de l'app (_expo/, assets/, icônes) : cache d'abord.
// - Pages : réseau d'abord, copie en cache si hors ligne.
// Pour forcer une mise à jour chez tout le monde, change le numéro de VERSION.
const VERSION = "v1";
const CACHE = `petites-maisons-${VERSION}`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  const isStatic =
    url.pathname.startsWith("/_expo/") || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/");

  if (isStatic) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Navigation et autres fichiers (index.html, manifest...) : réseau d'abord.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (req.mode === "navigate" || url.pathname === "/manifest.webmanifest")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req.mode === "navigate" ? "/" : req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req.mode === "navigate" ? "/" : req))
  );
});
