import { topbar, empty } from '../ui.js';
import { getHunt } from '../store.js';
import { esc, nl2br, confirmDialog, toast } from '../util.js';
import { theme, applyTheme, TEAM_COLORS } from '../themes.js';
import { AGES, MODES, needsGps, needsQr, checkHunt } from '../hunt.js';
import { createGame, hasGame } from '../game.js';
import { speak, sfx, canSpeak } from '../audio.js';
import { watch, geoErrorText } from '../geo.js';
import { go } from '../app.js';

const NAMES = {
  pirates: ['Les Requins Rieurs', 'Les Crochets d\'Or', 'Les Perroquets Pirates', 'Les Loups de Mer', 'Les Sabres Fous'],
  espions: ['Brigade Faucon', 'Les Ombres Grises', 'Unité Panthère', 'Les Lynx Masqués', 'Agence Zéro'],
  dinos: ['Les Petits T-Rex', 'Les Tricératops', 'Les Raptors Rapides', 'Les Bébés Diplos', 'Les Ptéros'],
  licornes: ['Les Paillettes', 'Les Arcs-en-ciel', 'Les Fées Filantes', 'Les Cornes d\'Étoile', 'Les Nuages Roses'],
  explorateurs: ['Les Boussoles Folles', 'Les Machettes', 'Expédition Jaguar', 'Les Grands Aventuriers', 'Les Lianes'],
};

export default async function start(app, { id, test }) {
  const hunt = await getHunt(id);
  if (!hunt) {
    app.innerHTML = topbar({ title: 'Chasse introuvable', back: '#/jouer' }) + `<div class="page">${empty('🧐', 'Chasse introuvable', 'Elle a peut-être été supprimée de ce téléphone.', '<a class="btn primary" href="#/jouer">Retour</a>')}</div>`;
    return;
  }
  const th = theme(hunt.theme);
  applyTheme(hunt.theme);
  const isTest = !!test;
  const errors = checkHunt(hunt).filter(i => i.level === 'error');
  let teamIdx = 0;
  const names = NAMES[hunt.theme] || NAMES.pirates;
  let nameIdx = Math.floor(Math.random() * names.length);
  const gps = needsGps(hunt);

  app.innerHTML = `
    ${topbar({ title: isTest ? 'Test de la chasse' : '', back: isTest ? `#/edit/${hunt.id}` : '#/jouer' })}
    <div class="page start">
      <div class="start-hero">
        <div class="start-emoji">${th.emoji}</div>
        <h1>${esc(hunt.name)}</h1>
        <p class="meta-line"><span>${MODES[hunt.mode].emoji} ${MODES[hunt.mode].label}</span><span>${hunt.steps.length} ${th.words.step.toLowerCase()}s</span><span>${AGES[hunt.age]}</span></p>
      </div>

      ${isTest ? `<div class="note">🧪 Mode test : des boutons « Simuler » remplacent le scan et le GPS. La partie en cours sur ce téléphone sera remplacée.</div>` : ''}
      ${errors.length ? `<div class="note bad">⚠️ Cette chasse n'est pas terminée : ${esc(errors[0].text)}</div>` : ''}

      ${hunt.intro ? `
        <div class="card story">
          ${canSpeak() ? `<button class="icon-btn speak" id="read" aria-label="Lire à voix haute">🔊</button>` : ''}
          <p>${nl2br(hunt.intro)}</p>
        </div>` : ''}

      <div class="card">
        ${hunt.teams > 1 ? `
          <h2 class="card-title">Quelle équipe êtes-vous ?</h2>
          <div class="team-pick">
            ${TEAM_COLORS.slice(0, hunt.teams).map((t, i) => `
              <button class="team-btn ${i === 0 ? 'on' : ''}" data-t="${i}" style="--team:${t.color}">
                <span>${i + 1}</span><small>${t.name}</small>
              </button>`).join('')}
          </div>` : ''}
        <label class="field">
          <span>Nom de ${hunt.teams > 1 ? 'l\'équipe' : 'votre équipe'}</span>
          <div class="input-row">
            <input id="tname" maxlength="32" value="${esc(names[nameIdx])}">
            <button class="icon-btn" id="dice" aria-label="Autre nom">🎲</button>
          </div>
        </label>
      </div>

      ${gps && !isTest ? `
        <div class="card perm">
          <p><b>📍 Cette chasse utilise le GPS.</b> Autorise la position maintenant pour ne pas perdre de temps.</p>
          <button class="btn small" id="gps">Autoriser la position</button>
          <p class="perm-status" id="gpsStatus"></p>
        </div>` : ''}
      ${needsQr(hunt) && !isTest ? `<p class="hint-text">📷 La caméra sera demandée au premier scan.</p>` : ''}
      ${gps ? `<p class="hint-text">Restez dans une zone sans voitures, avec un adulte.</p>` : ''}

      <button class="btn big primary go-btn" id="go" ${errors.length && !isTest ? 'disabled' : ''}>${esc(th.words.start)}</button>
    </div>`;

  app.querySelector('#read')?.addEventListener('click', () => speak(hunt.intro, { force: true }));
  app.querySelectorAll('.team-btn').forEach(b => b.onclick = () => {
    sfx.tap();
    teamIdx = +b.dataset.t;
    app.querySelectorAll('.team-btn').forEach(x => x.classList.toggle('on', x === b));
  });
  app.querySelector('#dice').onclick = () => {
    sfx.click();
    nameIdx = (nameIdx + 1) % names.length;
    app.querySelector('#tname').value = names[nameIdx];
  };
  let stopGeo = null;
  app.querySelector('#gps')?.addEventListener('click', () => {
    const st = app.querySelector('#gpsStatus');
    st.textContent = 'Recherche de la position…';
    stopGeo?.();
    stopGeo = watch(p => {
      st.textContent = `✅ Position trouvée (précision ± ${Math.round(p.acc)} m)`;
      stopGeo?.(); stopGeo = null;
    }, e => { st.textContent = '❌ ' + geoErrorText(e); });
  });

  app.querySelector('#go').onclick = async () => {
    const cur = hasGame();
    if (cur && cur.phase !== 'intro' && !(cur.huntId === hunt.id && cur.teamIdx === teamIdx && !isTest)) {
      const ok = await confirmDialog('Une partie est en cours', `« ${esc(cur.hunt.name)} » n'est pas terminée. La remplacer par cette nouvelle partie ?`, 'Remplacer');
      if (!ok) return;
    } else if (cur && cur.huntId === hunt.id && cur.teamIdx === teamIdx && !isTest && cur.phase !== 'intro') {
      const resume = await confirmDialog('Partie déjà commencée', 'Cette équipe a déjà commencé la chasse. Reprendre où elle en était ?', 'Reprendre');
      if (resume) return go('partie');
    }
    const t = TEAM_COLORS[teamIdx];
    createGame(hunt, {
      teamIdx,
      teamName: app.querySelector('#tname').value.trim() || names[nameIdx],
      teamColor: hunt.teams > 1 ? t.color : null,
      test: isTest,
    });
    sfx.fanfare();
    if (hunt.teams > 1 && hunt.staggered) toast(`Équipe ${teamIdx + 1} : votre parcours est différent des autres équipes.`);
    go('partie');
  };

  return () => stopGeo?.();
}
