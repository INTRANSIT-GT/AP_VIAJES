/* =====================================================================
 * sw.js - Service worker de "Registro de Viajes" (PWA)
 * ---------------------------------------------------------------------
 * Cachea el shell de la app para que funcione sin conexion en el telefono.
 * Estrategia:
 *   - Navegacion (HTML): red primero, y si falla, sirve el index cacheado.
 *   - Recursos propios (css/js/iconos): cache primero.
 *   - Recursos externos (CDN de SheetJS): red primero, con copia en cache.
 * ===================================================================== */

const CACHE = "registro-viajes-v3";

const ASSETS = [
  "./",
  "./index.html",
  "./config.js",
  "./styles.css",
  "./seed.js",
  "./store.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./assets/logo-color.png",
  "./assets/logo-white.png",
  "./assets/isologo-color.png",
  "./assets/isologo-white.png",
  "./assets/svc-almacenaje.png",
  "./assets/svc-transporte.png",
  "./assets/svc-personal.png",
  "./assets/svc-reacondicionamiento.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(ASSETS.map((a) => cache.add(a).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Recursos externos (CDN): red primero, respaldo en cache.
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Navegacion: red primero, respaldo al index cacheado (modo offline).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // config.js: RED PRIMERO (para que actualizar la configuracion se refleje
  // enseguida en los dispositivos, sin esperar a otra version del cache).
  if (url.pathname.endsWith("/config.js")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Recursos propios: cache primero.
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      });
    })
  );
});
