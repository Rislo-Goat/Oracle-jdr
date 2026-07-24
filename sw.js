/* Oracle — service worker : cache réseau-d'abord pour la coquille PWA. */
const CACHE = "oracle-v7";
const ASSETS = [
  "./", "index.html", "css/app.css",
  "js/data.js", "js/dnd.js", "js/state.js", "js/dice.js", "js/oracle.js", "js/ui.js", "js/app.js",
  "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.pathname.includes("/api/")) return; // jamais de cache pour l'API IA
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
