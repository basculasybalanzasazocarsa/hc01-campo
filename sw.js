/* sw.js — guarda la app en el teléfono para que abra sin internet.
   Versión: 236dc401 (cambia sola cada vez que se publica una versión nueva de index.html) */
const CACHE = "hc01-236dc401";
const ARCHIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;                       // los envíos al laboratorio nunca pasan por la caché
  if (url.hostname.endsWith("script.google.com") || url.hostname.endsWith("googleusercontent.com")) return;
  const esFuente = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !esFuente) return;
  // La página: primero la red (versión más reciente); si no hay señal en 4 s, la copia guardada.
  if (req.mode === "navigate") {
    e.respondWith(caches.open(CACHE).then(async c => {
      try {
        const r = await Promise.race([fetch(req), new Promise((_, ko) => setTimeout(() => ko(new Error("lenta")), 4000))]);
        if (r && r.ok) { c.put("./index.html", r.clone()); return r; }
      } catch (err) {}
      return (await c.match("./index.html")) || (await c.match(req, { ignoreSearch: true })) || new Response("Sin conexión", { status: 503 });
    }));
    return;
  }
  // Íconos, manifiesto y fuentes: primero la copia guardada; en segundo plano se actualiza si hay señal.
  e.respondWith(caches.open(CACHE).then(async c => {
    const guardada = await c.match(req, { ignoreSearch: true }) || (req.mode === "navigate" ? await c.match("./index.html") : null);
    const deRed = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => null);
    return guardada || (await deRed) || new Response("Sin conexión", { status: 503 });
  }));
});
