// Stockage local : IndexedDB pour les chasses et les photos, localStorage pour la partie en cours.
// Rien ne quitte le téléphone.

const DB_NAME = 'chasse-tresor';
const STORES = ['hunts', 'photos'];
let dbPromise;

function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => STORES.forEach(s => req.result.objectStoreNames.contains(s) || req.result.createObjectStore(s));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}
function tx(store, mode, fn) {
  return db().then(d => new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const s = t.objectStore(store);
    const r = fn(s);
    t.oncomplete = () => resolve(r?.result);
    t.onerror = () => reject(t.error);
  }));
}
const kv = store => ({
  get: k => tx(store, 'readonly', s => s.get(k)),
  set: (k, v) => tx(store, 'readwrite', s => s.put(v, k)),
  del: k => tx(store, 'readwrite', s => s.delete(k)),
  all: () => tx(store, 'readonly', s => s.getAll()),
  clear: () => tx(store, 'readwrite', s => s.clear()),
});

export const huntsDb = kv('hunts');
export const photosDb = kv('photos');

export async function listHunts() {
  const all = (await huntsDb.all()) || [];
  return all.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
export const getHunt = id => huntsDb.get(id);
export function saveHunt(h) {
  h.updatedAt = Date.now();
  return huntsDb.set(h.id, h);
}
export const deleteHunt = id => huntsDb.del(id);

// --- Partie en cours ---
const GAME_KEY = 'ct.game';
export function loadGame() {
  try { return JSON.parse(localStorage.getItem(GAME_KEY) || 'null'); } catch { return null; }
}
export function saveGame(g) {
  try { localStorage.setItem(GAME_KEY, JSON.stringify(g)); } catch (e) { console.warn('Sauvegarde impossible', e); }
}
export function clearGame() {
  localStorage.removeItem(GAME_KEY);
}

// --- Réglages ---
const SET_KEY = 'ct.settings';
const DEFAULTS = { sound: true, voice: true, vibrate: true };
export function settings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SET_KEY) || '{}') }; } catch { return { ...DEFAULTS }; }
}
export function setSetting(k, v) {
  const s = settings();
  s[k] = v;
  localStorage.setItem(SET_KEY, JSON.stringify(s));
}

// Demande au navigateur de ne pas effacer les données
export function persist() {
  try { navigator.storage?.persist?.(); } catch { /* ignoré */ }
}
