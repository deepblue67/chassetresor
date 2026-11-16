// Petits outils partagés par toute l'appli.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Texte multiligne -> HTML sûr avec retours à la ligne
export const nl2br = s => esc(s).replace(/\n/g, '<br>');

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O ni 1/I : lisible par les enfants
export function code(n = 5) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return [...a].map(x => ALPHA[x % ALPHA.length]).join('');
}
export const uid = () => code(8);

export function randomDigits(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return [...a].map(x => String(x % 10)).join('');
}

// Comparaison tolérante : accents, majuscules, ponctuation, articles
export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(le|la|les|l|un|une|des|du|de|d)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function answerMatches(given, answers) {
  const g = normalize(given);
  if (!g) return false;
  return (answers || []).some(a => {
    const n = normalize(a);
    if (!n) return false;
    if (n === g) return true;
    // une faute de frappe tolérée sur les mots de plus de 5 lettres
    return n.length > 5 && levenshtein(n, g) <= 1;
  });
}
function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 9;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

// --- Géographie ---
const R = 6371000;
const rad = d => d * Math.PI / 180;
export function distance(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export function bearing(a, b) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
export function fmtDist(m) {
  if (m == null || isNaN(m)) return '…';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

export function fmtDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = n => String(n).padStart(2, '0');
  return h ? `${h} h ${pad(m)}` : `${m} min ${pad(sec)}`;
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function vibrate(p) {
  try { if (navigator.vibrate) navigator.vibrate(p); } catch { /* iOS : pas de vibration */ }
}

// --- Images : redimensionnées pour rester légères dans le fichier de chasse ---
export function resizeImage(file, max = 640, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = e => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

export function pickImage({ capture = true } = {}) {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.capture = 'environment';
    input.onchange = () => resolve(input.files?.[0] || null);
    input.click();
  });
}

export function pickFile(accept) {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] || null);
    input.click();
  });
}

// --- Encodage compact (base64url + deflate) ---
export function bytesToB64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function b64urlToBytes(str) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
async function pipe(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}
export async function packText(text) {
  const raw = new TextEncoder().encode(text);
  if ('CompressionStream' in window) {
    try { return 'z' + bytesToB64url(await pipe(raw, new CompressionStream('deflate-raw'))); } catch { /* repli */ }
  }
  return 'r' + bytesToB64url(raw);
}
export async function unpackText(packed) {
  const kind = packed[0], body = b64urlToBytes(packed.slice(1));
  if (kind === 'z') return new TextDecoder().decode(await pipe(body, new DecompressionStream('deflate-raw')));
  return new TextDecoder().decode(body);
}

// --- Retour utilisateur : toast, dialogues ---
let toastTimer;
export function toast(msg, kind = '') {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.className = 'toast show ' + kind;
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

export function dialog({ title = '', body = '', actions = [{ label: 'OK', value: true, primary: true }], dismissable = true }) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'dialog-wrap';
    wrap.innerHTML = `
      <div class="dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        ${title ? `<h2>${esc(title)}</h2>` : ''}
        <div class="dialog-body">${body}</div>
        <div class="dialog-actions">
          ${actions.map((a, i) => `<button class="btn ${a.primary ? 'primary' : ''} ${a.danger ? 'danger' : ''}" data-i="${i}">${esc(a.label)}</button>`).join('')}
        </div>
      </div>`;
    const close = v => { wrap.classList.add('out'); setTimeout(() => wrap.remove(), 180); resolve(v); };
    wrap.addEventListener('click', e => {
      const b = e.target.closest('[data-i]');
      if (b) {
        const a = actions[+b.dataset.i];
        close(typeof a.value === 'function' ? a.value(wrap) : a.value);
      } else if (dismissable && e.target === wrap) close(null);
    });
    document.body.appendChild(wrap);
    wrap.querySelector('input,textarea,select')?.focus();
    wrap.querySelector('.btn.primary')?.focus({ preventScroll: true });
  });
}
export const confirmDialog = (title, body, okLabel = 'Confirmer', danger = false) =>
  dialog({ title, body: `<p>${body}</p>`, actions: [{ label: 'Annuler', value: false }, { label: okLabel, value: true, primary: !danger, danger }] });

export function promptDialog(title, label, value = '', { type = 'text', placeholder = '' } = {}) {
  return dialog({
    title,
    body: `<label class="field"><span>${esc(label)}</span><input type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" id="dlg-in"></label>`,
    actions: [{ label: 'Annuler', value: null }, { label: 'Valider', primary: true, value: w => w.querySelector('#dlg-in').value }],
  });
}

// Bouton à maintenir appuyé (validation par un adulte, accès parent)
export function holdButton(el, ms, onDone) {
  let t, start, raf;
  const ring = el.querySelector('.hold-fill');
  const tick = () => {
    const p = Math.min(1, (performance.now() - start) / ms);
    if (ring) ring.style.transform = `scaleX(${p})`;
    if (p < 1) raf = requestAnimationFrame(tick);
  };
  const down = e => {
    e.preventDefault();
    start = performance.now();
    raf = requestAnimationFrame(tick);
    t = setTimeout(() => { cancel(); vibrate(60); onDone(); }, ms);
  };
  const cancel = () => {
    clearTimeout(t); cancelAnimationFrame(raf);
    if (ring) ring.style.transform = 'scaleX(0)';
  };
  el.addEventListener('pointerdown', down);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, cancel));
  el.addEventListener('contextmenu', e => e.preventDefault());
}

export function download(filename, blobOrText, type = 'application/json') {
  const blob = blobOrText instanceof Blob ? blobOrText : new Blob([blobOrText], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export function slug(s) {
  return normalize(s).replace(/ /g, '-').slice(0, 40) || 'chasse';
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
