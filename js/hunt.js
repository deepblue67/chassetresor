// Modèle d'une chasse : création, vérifications, récompenses, ordre des équipes, partage.
import { code, uid, randomDigits, packText, unpackText, shuffle } from './util.js';

export const AGES = { '4-6': '4-6 ans', '7-9': '7-9 ans', '10-12': '10-12 ans' };
export const HINT_DELAYS = { '4-6': [30, 60, 100], '7-9': [45, 90, 150], '10-12': [60, 120, 200] };

export const MODES = {
  qr: { label: 'QR codes', emoji: '📷', desc: 'Maison, jardin, salle : on scanne des QR codes cachés.' },
  gps: { label: 'GPS', emoji: '📍', desc: 'Parc, forêt, village : l\'étape se débloque en arrivant sur place.' },
  mixte: { label: 'Mixte', emoji: '🧭', desc: 'Le GPS guide vers la zone, puis on cherche le QR code caché.' },
};
export const VALIDATIONS = {
  qr: { label: 'Scanner le QR code', emoji: '📷' },
  gps: { label: 'Arriver sur place (GPS)', emoji: '📍' },
  gpsqr: { label: 'GPS pour approcher + QR', emoji: '🧭' },
  aucune: { label: 'Bouton « On a trouvé ! »', emoji: '👆' },
};
export const NAVS = {
  radar: { label: 'Radar chaud / froid', emoji: '🌡️' },
  boussole: { label: 'Boussole + distance', emoji: '🧭' },
  carte: { label: 'Carte', emoji: '🗺️' },
};
export const CHALLENGES = {
  aucun: { label: 'Pas de défi', emoji: '—' },
  texte: { label: 'Devinette (réponse écrite)', emoji: '💬' },
  qcm: { label: 'Choix multiple', emoji: '🔤' },
  nombre: { label: 'Calcul / nombre', emoji: '🔢' },
  photo: { label: 'Défi photo', emoji: '📸' },
  adulte: { label: 'Défi validé par un adulte', emoji: '💪' },
};

export function newChallenge(type = 'texte') {
  return { type, q: '', answers: [], choices: ['', '', ''], correct: 0, hints: ['', '', ''], emoji: '' };
}

export function newStep(hunt, partial = {}) {
  const v = hunt?.mode === 'gps' ? 'gps' : hunt?.mode === 'mixte' ? 'gpsqr' : 'qr';
  return {
    id: uid(), code: code(5), title: '', clue: '', clueHint: '', cluePhoto: null, hide: '',
    lat: null, lng: null, radius: 20, validate: v, challenge: newChallenge('aucun'),
    ...partial,
  };
}

export function newHunt(partial = {}) {
  const age = partial.age || '7-9';
  return {
    id: code(6), v: 1, name: 'Ma chasse au trésor', theme: 'pirates', age, mode: 'qr',
    intro: '', finale: '', lock: { type: 'code', value: randomDigits(4), real: false },
    hintDelays: [...HINT_DELAYS[age]], nav: 'radar', zone: null, teams: 1, staggered: true,
    steps: [], createdAt: Date.now(), updatedAt: Date.now(),
    ...partial,
  };
}

// Donne de nouveaux identifiants à une chasse (modèle, copie, import)
export function reidentify(h) {
  const copy = structuredClone(h);
  copy.id = code(6);
  copy.createdAt = copy.updatedAt = Date.now();
  copy.steps.forEach(s => { s.id = uid(); s.code = code(5); });
  if (copy.lock?.type === 'code' && copy.lock.randomize) { copy.lock.value = randomDigits(copy.lock.value.length || 4); delete copy.lock.randomize; }
  return copy;
}

// Complète une chasse venue d'ailleurs (fichier, lien) avec les champs manquants
export function sanitize(h) {
  const base = newHunt();
  const out = { ...base, ...h, lock: { ...base.lock, ...(h.lock || {}) } };
  out.steps = (h.steps || []).map(s => {
    const st = { ...newStep(out), ...s };
    st.challenge = { ...newChallenge('aucun'), ...(s.challenge || {}) };
    st.challenge.hints = [0, 1, 2].map(i => st.challenge.hints?.[i] || '');
    return st;
  });
  if (!Array.isArray(out.hintDelays) || out.hintDelays.length !== 3) out.hintDelays = [...HINT_DELAYS[out.age] || HINT_DELAYS['7-9']];
  return out;
}

export const needsGps = h => h.steps.some(s => s.validate === 'gps' || s.validate === 'gpsqr');
export const needsQr = h => h.steps.some(s => s.validate === 'qr' || s.validate === 'gpsqr');
export const qrSteps = h => h.steps.filter(s => s.validate === 'qr' || s.validate === 'gpsqr');

// --- Récompenses : les caractères du code (ou du mot) répartis sur les étapes ---
export function rewardMap(h) {
  const map = {};
  h.steps.forEach(s => { map[s.id] = []; });
  const n = h.steps.length;
  if (!n || h.lock.type === 'aucun') return map;
  const chars = [...String(h.lock.value || '').replace(/\s/g, '')];
  const m = chars.length;
  chars.forEach((ch, i) => {
    // on remplit plutôt la fin de la chasse : le suspense monte
    const idx = m >= n ? Math.floor(i * n / m) : n - 1 - Math.floor((m - 1 - i) * n / m);
    map[h.steps[idx].id].push({ pos: i, ch: ch.toUpperCase() });
  });
  return map;
}

// --- Ordre des étapes pour une équipe (départs décalés, même arrivée) ---
export function teamOrder(h, teamIdx) {
  const ids = h.steps.map(s => s.id);
  if (!h.staggered || h.teams < 2 || ids.length < 3) return ids;
  const body = ids.slice(0, -1), last = ids[ids.length - 1];
  const shift = Math.round(teamIdx * body.length / h.teams) % body.length;
  return [...body.slice(shift), ...body.slice(0, shift), last];
}

// --- Liens ---
export const appBase = () => location.origin + location.pathname.replace(/index\.html$/, '');
export const stepQrText = (h, s) => `${appBase()}#/q/${h.id}/${s.code}`;

// Extrait le code d'étape d'un texte scanné (URL de l'appli ou code seul)
export function parseStepCode(text) {
  const t = String(text).trim();
  const m = t.match(/#\/q\/([A-Z0-9]+)\/([A-Z0-9]+)/i);
  if (m) return { huntId: m[1].toUpperCase(), code: m[2].toUpperCase() };
  if (/^[A-Z0-9]{4,8}$/i.test(t)) return { huntId: null, code: t.toUpperCase() };
  return null;
}

// --- Vérifications pour l'organisateur ---
export function checkHunt(h) {
  const issues = [];
  if (!h.steps.length) issues.push({ level: 'error', text: 'Ajoute au moins une étape.' });
  if (h.lock.type === 'code' && !/^\d{1,8}$/.test(h.lock.value || '')) issues.push({ level: 'error', text: 'Le code du cadenas doit contenir de 1 à 8 chiffres.' });
  if (h.lock.type === 'mot' && !/^[A-Za-zÀ-ÿ]{2,12}$/.test(h.lock.value || '')) issues.push({ level: 'error', text: 'Le mot mystère doit faire de 2 à 12 lettres, sans espace.' });
  h.steps.forEach((s, i) => {
    const n = `Étape ${i + 1}`;
    if (!s.clue && !s.cluePhoto) issues.push({ level: 'warn', text: `${n} : pas d'indice pour trouver l'endroit.`, step: s.id });
    if ((s.validate === 'gps' || s.validate === 'gpsqr') && (s.lat == null || s.lng == null)) issues.push({ level: 'error', text: `${n} : place le point sur la carte.`, step: s.id });
    const c = s.challenge;
    if (c.type !== 'aucun' && c.type !== 'photo' && c.type !== 'adulte' && !c.q) issues.push({ level: 'error', text: `${n} : la question du défi est vide.`, step: s.id });
    if ((c.type === 'photo' || c.type === 'adulte') && !c.q) issues.push({ level: 'error', text: `${n} : décris le défi.`, step: s.id });
    if ((c.type === 'texte' || c.type === 'nombre') && !c.answers.filter(Boolean).length) issues.push({ level: 'error', text: `${n} : indique la bonne réponse.`, step: s.id });
    if (c.type === 'qcm' && c.choices.filter(Boolean).length < 2) issues.push({ level: 'error', text: `${n} : il faut au moins 2 choix.`, step: s.id });
  });
  if (h.teams > 1 && h.steps.length < 3) issues.push({ level: 'warn', text: 'Avec plusieurs équipes, prévois au moins 3 étapes pour qu\'elles ne se suivent pas.' });
  return issues;
}

// --- Partage d'une chasse vers d'autres téléphones ---
export async function packHunt(h, { photos = true } = {}) {
  const copy = structuredClone(h);
  delete copy.createdAt; delete copy.updatedAt;
  copy.steps.forEach(s => {
    delete s.hide; // l'emplacement des QR reste chez l'organisateur
    if (!photos) s.cluePhoto = null;
  });
  return packText(JSON.stringify(copy));
}
export async function unpackHunt(packed) {
  return sanitize(JSON.parse(await unpackText(packed)));
}
export const shareLink = packed => `${appBase()}#/i/${packed}`;

export function mysteryOrder(chars) {
  return shuffle(chars);
}
