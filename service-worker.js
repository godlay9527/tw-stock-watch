self.addEventListener("install",e=>e.waitUntil(caches.open("tw-stock-v2").then(c=>c.addAll(["./","index.html","app.js","manifest.webmanifest","icon.svg"]))));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
