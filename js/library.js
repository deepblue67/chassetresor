// Sélecteur dans la bibliothèque d'énigmes.
import { RIDDLES } from './riddles.js';
import { AGES, CHALLENGES } from './hunt.js';
import { esc } from './util.js';

export function pickRiddle(defaultAge = '7-9') {
  return new Promise(resolve => {
    let age = defaultAge, type = 'all';
    const el = document.createElement('div');
    el.className = 'sheet-wrap';
    el.innerHTML = `
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Bibliothèque d'énigmes">
        <div class="sheet-head">
          <h2>📚 Bibliothèque d'énigmes</h2>
          <button class="icon-btn" data-close aria-label="Fermer">✕</button>
        </div>
        <div class="chips small" data-age>${Object.entries(AGES).map(([k, v]) => `<button class="chip ${k === age ? 'on' : ''}" data-v="${k}">${v}</button>`).join('')}</div>
        <div class="chips small" data-type>
          <button class="chip on" data-v="all">Tout</button>
          ${['texte', 'qcm', 'nombre', 'photo', 'adulte'].map(k => `<button class="chip" data-v="${k}">${CHALLENGES[k].emoji} ${CHALLENGES[k].label.replace(/ \(.*\)/, '')}</button>`).join('')}
        </div>
        <div class="riddle-list"></div>
      </div>`;
    document.body.appendChild(el);
    const list = el.querySelector('.riddle-list');
    const draw = () => {
      const items = RIDDLES[age].map((r, i) => ({ r, i })).filter(({ r }) => type === 'all' || r.type === type);
      list.innerHTML = items.map(({ r, i }) => `
        <button class="riddle" data-i="${i}">
          <span class="riddle-emoji">${r.emoji || CHALLENGES[r.type].emoji}</span>
          <span class="riddle-body"><span>${esc(r.q)}</span>
            <small>${CHALLENGES[r.type].label}${r.answers?.length ? `, réponse : ${esc(r.answers[0])}` : r.type === 'qcm' ? `, réponse : ${esc(r.choices[r.correct])}` : ''}</small>
          </span>
        </button>`).join('') || '<p class="muted">Rien dans cette catégorie.</p>';
    };
    draw();
    const close = v => { el.classList.add('out'); setTimeout(() => el.remove(), 200); resolve(v); };
    el.addEventListener('click', e => {
      if (e.target === el || e.target.closest('[data-close]')) return close(null);
      const chip = e.target.closest('.chip');
      if (chip) {
        const group = chip.parentElement;
        group.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === chip));
        if (group.hasAttribute('data-age')) age = chip.dataset.v; else type = chip.dataset.v;
        draw();
        return;
      }
      const r = e.target.closest('.riddle');
      if (r) {
        const src = RIDDLES[age][+r.dataset.i];
        close(structuredClone({ choices: ['', '', ''], correct: 0, answers: [], ...src, hints: [0, 1, 2].map(i => src.hints?.[i] || '') }));
      }
    });
  });
}
