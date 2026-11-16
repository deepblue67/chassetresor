// Sons synthétisés (aucun fichier audio à télécharger) et lecture à voix haute.
import { settings, setSetting } from './store.js';
import { vibrate } from './util.js';

let ctx;
function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
// À appeler sur un geste utilisateur (iOS exige un toucher pour activer le son)
export function unlockAudio() { ac(); }

function tone(freq, start, dur, { type = 'sine', vol = 0.18, slide = 0 } = {}) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const on = () => settings().sound;
const buzz = p => settings().vibrate && vibrate(p);

export const sfx = {
  tap() { if (on()) tone(660, 0, 0.06, { type: 'triangle', vol: 0.08 }); },
  scan() { if (on()) { tone(1200, 0, 0.08, { type: 'square', vol: 0.06 }); tone(1600, 0.08, 0.1, { type: 'square', vol: 0.06 }); } buzz(40); },
  success() {
    if (on()) [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, { type: 'triangle', vol: 0.16 }));
    buzz([60, 40, 60, 40, 140]);
  },
  wrong() { if (on()) { tone(220, 0, 0.18, { type: 'sawtooth', vol: 0.07, slide: -60 }); tone(180, 0.16, 0.24, { type: 'sawtooth', vol: 0.07, slide: -60 }); } buzz([120, 60, 120]); },
  hint() { if (on()) { tone(880, 0, 0.12, { vol: 0.1 }); tone(1320, 0.1, 0.2, { vol: 0.08 }); } buzz(30); },
  coin() { if (on()) { tone(988, 0, 0.08, { type: 'square', vol: 0.07 }); tone(1319, 0.08, 0.32, { type: 'square', vol: 0.07 }); } },
  click() { if (on()) tone(1800, 0, 0.025, { type: 'square', vol: 0.05 }); },
  unlock() {
    if (on()) {
      tone(300, 0, 0.08, { type: 'square', vol: 0.08 });
      tone(200, 0.1, 0.12, { type: 'square', vol: 0.08 });
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.3 + i * 0.1, 0.4, { type: 'triangle', vol: 0.14 }));
    }
    buzz([80, 50, 80, 50, 300]);
  },
  fanfare() {
    if (!on()) return;
    const n = [[392, 0, .15], [392, .16, .15], [392, .32, .15], [523, .48, .6], [659, .9, .15], [523, 1.06, .15], [784, 1.22, .9]];
    n.forEach(([f, s, d]) => { tone(f, s, d, { type: 'triangle', vol: 0.15 }); tone(f / 2, s, d, { type: 'sine', vol: 0.08 }); });
  },
  alarm() { if (on()) for (let i = 0; i < 4; i++) tone(i % 2 ? 660 : 880, i * 0.22, 0.2, { type: 'square', vol: 0.08 }); buzz([300, 100, 300]); },
  // Bip du radar : plus aigu quand on chauffe
  radar(level) {
    if (on()) tone(300 + level * 180, 0, 0.09, { type: 'sine', vol: 0.12 });
    if (level >= 3) buzz(level >= 4 ? 90 : 40);
  },
};

// --- Lecture à voix haute ---
let voice;
function pickVoice() {
  const voices = speechSynthesis.getVoices();
  voice = voices.find(v => /fr[-_]FR/i.test(v.lang) && /google|amélie|audrey|thomas|marie|denise/i.test(v.name))
    || voices.find(v => /^fr/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
export const canSpeak = () => 'speechSynthesis' in window;
export function speak(text, { force = false } = {}) {
  if (!canSpeak() || (!force && !settings().voice)) return;
  speechSynthesis.cancel();
  // Les émojis sont lus de façon bizarre : on les retire
  const clean = String(text).replace(/[\p{Extended_Pictographic}‍️]/gu, '').replace(/_{2,}/g, ' blanc ');
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = 'fr-FR';
  if (voice) u.voice = voice;
  u.rate = 0.92;
  u.pitch = 1.05;
  speechSynthesis.speak(u);
}
export function stopSpeaking() { if (canSpeak()) speechSynthesis.cancel(); }

export function toggleSound() { const v = !settings().sound; setSetting('sound', v); return v; }
export function toggleVoice() { const v = !settings().voice; setSetting('voice', v); if (!v) stopSpeaking(); return v; }
