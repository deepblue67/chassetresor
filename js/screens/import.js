// Réception d'une chasse par lien ou QR code.
import { unpackHunt, AGES, MODES } from '../hunt.js';
import { getHunt, saveHunt } from '../store.js';
import { esc } from '../util.js';
import { theme, applyTheme } from '../themes.js';
import { topbar, empty } from '../ui.js';
import { go } from '../app.js';

export default async function importScreen(app, { data }) {
  let h;
  try {
    h = await unpackHunt(data);
    if (!h.steps.length) throw new Error('vide');
  } catch {
    app.innerHTML = topbar({ title: 'Chasse reçue', back: '#/' }) + `<div class="page">${empty('😕', 'Lien illisible', 'Ce lien de chasse est incomplet ou abîmé. Demande à l\'organisateur de le renvoyer.', '<a class="btn primary" href="#/">Accueil</a>')}</div>`;
    return;
  }
  const existing = await getHunt(h.id);
  const th = theme(h.theme);
  applyTheme(h.theme);
  // on garde les notes de cachette si l'organisateur ouvre son propre lien
  if (existing) h.steps.forEach(s => { const o = existing.steps.find(x => x.id === s.id); if (o?.hide) s.hide = o.hide; });

  app.innerHTML = `
    ${topbar({ title: 'Chasse reçue', back: '#/' })}
    <div class="page start">
      <div class="start-hero">
        <div class="start-emoji">${th.emoji}</div>
        <h1>${esc(h.name)}</h1>
        <p class="meta-line"><span>${MODES[h.mode].emoji} ${MODES[h.mode].label}</span><span>${h.steps.length} étapes</span><span>${AGES[h.age]}</span></p>
      </div>
      ${existing ? '<div class="note">Cette chasse est déjà sur ce téléphone : elle sera mise à jour.</div>' : ''}
      <div class="stack">
        <button class="btn big primary" id="play">${esc(th.words.start)}</button>
        <button class="btn" id="keep">Juste l'enregistrer</button>
      </div>
    </div>`;
  const save = async () => { h.received = true; await saveHunt(h); };
  app.querySelector('#play').onclick = async () => { await save(); go('depart/' + h.id); };
  app.querySelector('#keep').onclick = async () => { await save(); go('jouer'); };
}
