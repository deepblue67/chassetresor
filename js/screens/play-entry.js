import { topbar } from '../ui.js';
import { listHunts, saveHunt } from '../store.js';
import { esc, pickFile, toast } from '../util.js';
import { openScanner } from '../qr.js';
import { sanitize } from '../hunt.js';
import { theme } from '../themes.js';
import { instantiate } from '../templates.js';
import { go } from '../app.js';
import { AGES } from '../hunt.js';

export default async function playEntry(app) {
  const hunts = (await listHunts()).filter(h => !h.demo);

  app.innerHTML = `
    ${topbar({ title: 'Jouer', back: '#/' })}
    <div class="page">
      <div class="stack">
        <button class="btn big primary" id="scan"><span class="btn-emoji">📷</span><span class="btn-text">Scanner la chasse<small>Le QR code affiché sur le téléphone de l'organisateur</small></span></button>
        <button class="btn big" id="file"><span class="btn-emoji">📂</span><span class="btn-text">Ouvrir un fichier de chasse<small>Reçu par message ou par mail</small></span></button>
        <button class="btn big" id="demo"><span class="btn-emoji">✨</span><span class="btn-text">Essayer la démo<small>4 étapes, rien à cacher, 5 minutes</small></span></button>
      </div>

      ${hunts.length ? `
        <h2 class="section-title">Chasses sur ce téléphone</h2>
        <div class="hunt-list">
          ${hunts.map(h => `
            <a class="hunt-card" href="#/depart/${h.id}" style="--tc:${theme(h.theme).colors.bg}">
              <span class="hunt-emoji">${theme(h.theme).emoji}</span>
              <span class="hunt-info"><b>${esc(h.name)}</b><small>${h.steps.length} étape${h.steps.length > 1 ? 's' : ''}, ${AGES[h.age]}</small></span>
              <span class="hunt-go">▶</span>
            </a>`).join('')}
        </div>` : ''}
    </div>`;

  app.querySelector('#scan').onclick = async () => {
    const text = await openScanner({
      title: 'Scanne la chasse',
      manual: false,
      accept: t => t.includes('#/i/') ? true : (/#\/q\//.test(t) ? 'C\'est le QR d\'une étape. Scanne d\'abord le QR de la chasse.' : 'Ce QR code n\'est pas une chasse au trésor.'),
    });
    if (text) location.hash = '#/i/' + text.split('#/i/')[1];
  };

  app.querySelector('#file').onclick = async () => {
    const f = await pickFile('.json,.chasse,application/json');
    if (!f) return;
    try {
      const h = sanitize(JSON.parse(await f.text()));
      if (!h.steps.length) throw new Error('vide');
      await saveHunt(h);
      toast('Chasse ajoutée !');
      go('depart/' + h.id);
    } catch {
      toast('Ce fichier n\'est pas une chasse au trésor.', 'bad');
    }
  };

  app.querySelector('#demo').onclick = async () => {
    const h = instantiate('demo');
    h.id = 'DEMO';
    h.demo = true;
    await saveHunt(h);
    go('depart/DEMO');
  };
}
