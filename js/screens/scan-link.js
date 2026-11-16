// Un QR d'étape scanné avec l'appareil photo du téléphone ouvre l'appli ici.
import { loadGame } from '../store.js';
import { rememberPendingScan } from '../game.js';
import { go } from '../app.js';
import { empty } from '../ui.js';

export default function scanLink(app, { hunt, code }) {
  const g = loadGame();
  if (g && g.phase !== 'done' && g.huntId === hunt.toUpperCase()) {
    rememberPendingScan(`#/q/${hunt.toUpperCase()}/${code.toUpperCase()}`);
    go('partie');
    return;
  }
  app.innerHTML = `<div class="page">${empty('🔎', 'Un indice de chasse au trésor !',
    g && g.phase !== 'done' ? 'Ce QR code appartient à une autre chasse que celle en cours sur ce téléphone.' : 'Pour l\'utiliser, lance d\'abord la chasse sur ce téléphone, puis scanne les indices depuis l\'appli.',
    '<a class="btn primary" href="#/jouer">Jouer</a>')}</div>`;
}
