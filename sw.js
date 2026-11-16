// Service worker : l'appli fonctionne hors ligne une fois ouverte.
// Les fichiers de l'appli sont servis depuis le cache puis rafraîchis en arrière-plan.
// Pense à changer VERSION quand tu ajoutes ou renommes un fichier.
const VERSION = 'v1.1.1';
const APP_CACHE = 'chasse-app-' + VERSION;
const TILE_CACHE = 'chasse-tuiles';
const MAX_TILES = 600;

const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/audio.js', 'js/diploma.js', 'js/fx.js', 'js/game.js', 'js/geo.js', 'js/hunt.js', 'js/library.js',
  'js/qr.js', 'js/radar.js', 'js/riddles.js', 'js/store.js', 'js/templates.js', 'js/themes.js', 'js/ui.js', 'js/util.js',
  'js/screens/editor.js', 'js/screens/game.js', 'js/screens/help.js', 'js/screens/home.js', 'js/screens/import.js',
  'js/screens/map-editor.js', 'js/screens/org.js', 'js/screens/play-entry.js', 'js/screens/print.js',
  'js/screens/scan-link.js', 'js/screens/share.js', 'js/screens/start.js', 'js/screens/step-editor.js',
  'vendor/qrcode.js', 'vendor/jsQR.js', 'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css',
  'vendor/leaflet/images/layers.png', 'vendor/leaflet/images/layers-2x.png', 'vendor/leaflet/images/marker-icon.png',
  'vendor/leaflet/images/marker-icon-2x.png', 'vendor/leaflet/images/marker-shadow.png',
  'vendor/fonts/fredoka-latin-500-normal.woff2', 'vendor/fonts/fredoka-latin-600-normal.woff2', 'vendor/fonts/fredoka-latin-700-normal.woff2',
  'vendor/fonts/nunito-latin-400-normal.woff2', 'vendor/fonts/nunito-latin-600-normal.woff2', 'vendor/fonts/nunito-latin-700-normal.woff2',
  'vendor/fonts/nunito-latin-800-normal.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('chasse-app-') && k !== APP_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trimTiles() {
  const c = await caches.open(TILE_CACHE);
  const keys = await c.keys();
  if (keys.length > MAX_TILES) await Promise.all(keys.slice(0, keys.length - MAX_TILES).map(k => c.delete(k)));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Tuiles de carte : on garde celles déjà vues (utile sur place sans réseau)
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith(caches.open(TILE_CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); trimTiles(); }
        return res;
      } catch { return new Response('', { status: 504 }); }
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // Fichiers de l'appli : cache d'abord, mise à jour en arrière-plan
  e.respondWith(caches.open(APP_CACHE).then(async c => {
    const key = req.mode === 'navigate' ? 'index.html' : req;
    const hit = await c.match(key, { ignoreSearch: true });
    const fresh = fetch(req).then(res => {
      if (res.ok && req.mode !== 'navigate') c.put(req, res.clone());
      if (res.ok && req.mode === 'navigate') c.put('index.html', res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }
    return (await fresh) || new Response('Hors ligne', { status: 503 });
  }));
});
