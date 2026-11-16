// Point d'entrée : routeur et démarrage.
import { applyTheme } from './themes.js';
import { unlockAudio } from './audio.js';
import { persist } from './store.js';
import { toast } from './util.js';

const ROUTES = [
  [/^$/, 'home'],
  [/^jouer$/, 'play-entry'],
  [/^depart\/([A-Z0-9]+)(\/test)?$/, 'start', ['id', 'test']],
  [/^partie$/, 'game'],
  [/^org$/, 'org'],
  [/^edit\/([A-Z0-9]+)$/, 'editor', ['id']],
  [/^edit\/([A-Z0-9]+)\/s\/([A-Z0-9]+)$/, 'step-editor', ['id', 'sid']],
  [/^edit\/([A-Z0-9]+)\/carte$/, 'map-editor', ['id']],
  [/^partager\/([A-Z0-9]+)$/, 'share', ['id']],
  [/^imprimer\/([A-Z0-9]+)$/, 'print', ['id']],
  [/^q\/([A-Z0-9]+)\/([A-Z0-9]+)$/i, 'scan-link', ['hunt', 'code']],
  [/^i\/(.+)$/, 'import', ['data']],
  [/^aide$/, 'help'],
];

const app = document.getElementById('app');
let cleanup = null;
let navToken = 0;

async function route() {
  const token = ++navToken;
  const hash = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  let screen = 'home', params = {};
  for (const [re, name, keys = []] of ROUTES) {
    const m = hash.match(re);
    if (m) { screen = name; keys.forEach((k, i) => { params[k] = m[i + 1]; }); break; }
  }
  document.querySelectorAll('.dialog-wrap, .sheet-wrap, .found-burst').forEach(e => e.remove());
  if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { console.warn(e); } }
  cleanup = null;
  try {
    const mod = await import(`./screens/${screen}.js`);
    if (token !== navToken) return;
    applyTheme(null);
    app.classList.remove('enter');
    void app.offsetWidth;
    app.classList.add('enter');
    window.scrollTo(0, 0);
    cleanup = await mod.default(app, params);
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="page"><div class="card"><h2>Oups, cet écran n'a pas pu s'ouvrir.</h2><p>${String(e.message || e)}</p><a class="btn primary" href="#/">Retour à l'accueil</a></div></div>`;
  }
}

export function go(path) {
  const target = '#/' + path.replace(/^#?\/?/, '');
  if (location.hash === target) route();
  else location.hash = target;
}

window.addEventListener('hashchange', route);
document.addEventListener('pointerdown', unlockAudio, { once: true });
persist();
route();

// --- Appli installable et hors ligne ---
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Nouvelle version prête : elle sera active au prochain lancement.');
      });
    });
  }).catch(() => {});
}

let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPrompt = e;
  document.dispatchEvent(new CustomEvent('can-install'));
});
export const canInstall = () => !!installPrompt;
export async function install() {
  if (!installPrompt) return false;
  installPrompt.prompt();
  const r = await installPrompt.userChoice;
  installPrompt = null;
  return r.outcome === 'accepted';
}
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
