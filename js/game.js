// Logique d'une partie (indépendante de l'affichage).
import { teamOrder, rewardMap, parseStepCode } from './hunt.js';
import { loadGame, saveGame } from './store.js';

export function createGame(hunt, { teamIdx = 0, teamName = '', teamColor = null, test = false } = {}) {
  const g = {
    v: 1, key: Date.now().toString(36), huntId: hunt.id, hunt: structuredClone(hunt),
    teamIdx, teamName, teamColor, test,
    order: teamOrder(hunt, teamIdx), pos: 0, phase: 'intro',
    startedAt: null, phaseStartedAt: Date.now(), finishedAt: null,
    hints: {}, locHints: {}, wrong: 0, collected: [], photos: [], done: [],
  };
  saveGame(g);
  return g;
}

export const currentStep = g => g.hunt.steps.find(s => s.id === g.order[g.pos]) || null;
export const stepNumber = g => Math.min(g.pos + 1, g.order.length);
export const totalHints = g => Object.values(g.hints).reduce((a, b) => a + b, 0) + Object.keys(g.locHints).length;

export function setPhase(g, phase) {
  g.phase = phase;
  g.phaseStartedAt = Date.now();
  if (phase === 'nav' && !g.startedAt) g.startedAt = Date.now();
  saveGame(g);
}

// Ce qu'on gagne à une étape
export function rewardsFor(g, stepId) {
  return rewardMap(g.hunt)[stepId] || [];
}

export function completeStep(g) {
  const s = currentStep(g);
  if (!s) return;
  if (!g.done.includes(s.id)) {
    g.done.push(s.id);
    rewardsFor(g, s.id).forEach(r => g.collected.push({ ...r, stepId: s.id }));
  }
  setPhase(g, 'reward');
}

export function nextStep(g) {
  g.pos++;
  if (g.pos >= g.order.length) setPhase(g, 'final');
  else setPhase(g, 'nav');
}

export function finish(g) {
  g.finishedAt = Date.now();
  setPhase(g, 'done');
}

// Vérifie un QR scanné pendant la partie. Renvoie true ou un message.
export function checkScan(g, text) {
  const p = parseStepCode(text);
  if (!p) {
    if (String(text).includes('#/i/')) return 'C\'est le QR d\'une chasse entière, pas d\'une étape.';
    return 'Ce QR code ne fait pas partie de la chasse.';
  }
  if (p.huntId && p.huntId !== g.huntId) return 'Ce QR code vient d\'une autre chasse !';
  const cur = currentStep(g);
  if (cur && cur.code === p.code) return true;
  const s = g.hunt.steps.find(x => x.code === p.code);
  if (!s) return 'Code inconnu. Vérifie les lettres.';
  if (g.done.includes(s.id)) return 'Déjà trouvé ! Cherche l\'indice suivant.';
  return 'Pas encore ! Ce QR servira plus tard. Résous d\'abord l\'étape en cours.';
}

// Un QR scanné avec l'appareil photo du téléphone ouvre l'appli sur #/q/... : on le garde pour la partie.
export function rememberPendingScan(text) {
  sessionStorage.setItem('ct.pending', text);
}
export function takePendingScan() {
  const t = sessionStorage.getItem('ct.pending');
  sessionStorage.removeItem('ct.pending');
  return t;
}

export function hasGame() {
  const g = loadGame();
  return g && g.phase !== 'done' ? g : null;
}

// Étoiles du diplôme : moins d'indices = plus d'étoiles
export function stars(g) {
  const n = g.order.length || 1;
  const ratio = (totalHints(g) + g.wrong * 0.25) / n;
  return ratio <= 0.3 ? 3 : ratio <= 1 ? 2 : 1;
}
