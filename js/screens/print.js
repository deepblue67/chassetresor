// Planche de QR codes à imprimer (ou enregistrer en PDF depuis le menu d'impression).
import { topbar, toggle, empty } from '../ui.js';
import { getHunt } from '../store.js';
import { esc } from '../util.js';
import { theme } from '../themes.js';
import { qrSteps, stepQrText, rewardMap, VALIDATIONS } from '../hunt.js';
import { qrSvg } from '../qr.js';

export default async function print(app, { id }) {
  const h = await getHunt(id);
  if (!h) { app.innerHTML = `<div class="page">${empty('🧐', 'Chasse introuvable', '', '<a class="btn primary" href="#/org">Retour</a>')}</div>`; return; }
  const th = theme(h.theme);
  const steps = qrSteps(h);
  const opts = { hide: false, sheet: true, big: false };

  app.innerHTML = `
    ${topbar({ title: 'Imprimer les QR codes', back: `#/edit/${h.id}` })}
    <div class="page print-controls no-print">
      ${steps.length ? `
        <div class="card">
          <p>${steps.length} QR code${steps.length > 1 ? 's' : ''} à découper et cacher. Dans le menu d'impression, choisis « Enregistrer en PDF » pour garder une copie.</p>
          ${toggle('optSheet', 'Fiche organisateur en première page', opts.sheet, 'Où cacher chaque QR, et le code du trésor.')}
          ${toggle('optHide', 'Écrire la cachette sous chaque QR', opts.hide, 'Pratique pour ne pas se tromper. À découper avant de cacher.')}
          ${toggle('optBig', 'Grand format (4 par page)', opts.big)}
          <button class="btn big primary" id="doPrint">🖨️ Imprimer ou enregistrer en PDF</button>
        </div>` : empty('📍', 'Pas de QR code à imprimer', 'Toutes les étapes de cette chasse se valident par GPS ou par bouton.')}
    </div>
    <div class="print-area" id="area"></div>`;

  const rw = rewardMap(h);
  function draw() {
    const sheet = opts.sheet ? `
      <section class="print-sheet">
        <h1>${th.emoji} ${esc(h.name)}</h1>
        <p class="sheet-sub">Fiche organisateur, à garder pour toi.</p>
        <table>
          <thead><tr><th>Étape</th><th>Indice</th><th>Validation</th><th>Cachette</th><th>Code</th><th>Récompense</th></tr></thead>
          <tbody>${h.steps.map((s, i) => `
            <tr><td>${i + 1}</td><td>${esc(s.title || s.clue).slice(0, 80)}</td><td>${VALIDATIONS[s.validate].emoji}</td><td>${esc(s.hide || (s.validate === 'gps' ? 'GPS' : '—'))}</td><td class="mono">${s.validate === 'qr' || s.validate === 'gpsqr' ? s.code : ''}</td><td>${(rw[s.id] || []).map(r => esc(r.ch)).join(' ') || '⭐'}</td></tr>`).join('')}
          </tbody>
        </table>
        ${h.lock.type !== 'aucun' ? `<p class="sheet-code">${h.lock.type === 'code' ? 'Code du cadenas' : 'Mot mystère'} : <b>${esc(h.lock.value)}</b>${h.lock.type === 'code' ? (h.lock.real ? ' (règle ton vrai cadenas sur ce code)' : ' (cadenas dans l\'appli)') : ''}</p>` : ''}
        ${h.finale ? `<p><b>Le coffre :</b> ${esc(h.finale)}</p>` : ''}
        <p class="sheet-tip">✂️ Découpe les cartes, cache-les, et garde cette fiche. Si un QR est abîmé, les enfants peuvent taper le code écrit dessous.</p>
      </section>` : '';
    const cards = steps.map(s => {
      const n = h.steps.indexOf(s) + 1;
      return `
        <div class="qr-card" style="--tc:${th.id === 'espions' ? th.colors.accent : th.colors.bg}">
          <div class="qr-card-head"><span>${th.emoji}</span><b>${esc(h.name)}</b><span class="qr-n">${n}</span></div>
          ${qrSvg(stepQrText(h, s), { ecc: 'Q', margin: 2 })}
          <div class="qr-code-txt">Code secret : <b>${s.code}</b></div>
          <div class="qr-card-foot">Scanne-moi avec l'appli Chasse au trésor</div>
          ${opts.hide ? `<div class="qr-hide">✂ Étape ${n} : ${esc(s.hide || 'cachette à définir')}</div>` : ''}
        </div>`;
    }).join('');
    app.querySelector('#area').innerHTML = sheet + `<section class="qr-grid ${opts.big ? 'big' : ''}">${cards}</section>`;
  }
  if (!steps.length) return;
  app.querySelector('#optSheet').onchange = e => { opts.sheet = e.target.checked; draw(); };
  app.querySelector('#optHide').onchange = e => { opts.hide = e.target.checked; draw(); };
  app.querySelector('#optBig').onchange = e => { opts.big = e.target.checked; draw(); };
  app.querySelector('#doPrint').onclick = () => window.print();
  draw();
}
