// Éditeur d'une chasse : réglages, histoire, trésor, étapes, options.
import { topbar, chips, bindChips, toggle, empty } from '../ui.js';
import { getHunt, saveHunt } from '../store.js';
import { esc, toast, randomDigits } from '../util.js';
import { THEMES, theme } from '../themes.js';
import { AGES, MODES, NAVS, VALIDATIONS, CHALLENGES, HINT_DELAYS, newStep, checkHunt, rewardMap, needsGps } from '../hunt.js';
import { pickRiddle } from '../library.js';
import { go } from '../app.js';

export default async function editor(app, { id }) {
  const h = await getHunt(id);
  if (!h) {
    app.innerHTML = topbar({ title: 'Introuvable', back: '#/org' }) + `<div class="page">${empty('🧐', 'Chasse introuvable', 'Elle a peut-être été supprimée.', '<a class="btn primary" href="#/org">Retour</a>')}</div>`;
    return;
  }
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => saveHunt(h).then(refreshIssues), 300); };

  const themeOpts = Object.fromEntries(Object.values(THEMES).map(t => [t.id, { label: t.name, emoji: t.emoji }]));
  const ageOpts = Object.fromEntries(Object.entries(AGES).map(([k, v]) => [k, { label: v }]));
  const lockOpts = { code: { label: 'Code à chiffres', emoji: '🔢' }, mot: { label: 'Mot mystère', emoji: '🔤' }, aucun: { label: 'Sans code', emoji: '🎁' } };
  const teamOpts = { 1: { label: '1 équipe' }, 2: { label: '2' }, 3: { label: '3' }, 4: { label: '4' } };

  app.innerHTML = `
    ${topbar({ title: 'Ma chasse', back: '#/org', right: `<a class="icon-btn" href="#/depart/${h.id}/test" aria-label="Tester">🧪</a>` })}
    <div class="page editor">
      <section class="card">
        <label class="field big"><span>Nom de la chasse</span><input id="name" value="${esc(h.name)}" maxlength="60"></label>
        <div class="field"><span>Univers</span>${chips('theme', themeOpts, h.theme)}</div>
        <div class="field"><span>Âge des joueurs</span>${chips('age', ageOpts, h.age, { small: true })}</div>
        <div class="field"><span>Terrain</span>${chips('mode', MODES, h.mode)}<p class="help" id="modeDesc">${esc(MODES[h.mode].desc)}</p></div>
      </section>

      <section class="card">
        <h2 class="card-title">L'histoire</h2>
        <label class="field"><span>Message de départ</span><textarea id="intro" rows="4" placeholder="Le terrible capitaine a caché son trésor…">${esc(h.intro)}</textarea></label>
        <label class="field"><span>Message final : où est caché le coffre ?</span><textarea id="finale" rows="3" placeholder="Le coffre est caché dans le panier à linge !">${esc(h.finale)}</textarea></label>
      </section>

      <section class="card">
        <h2 class="card-title">Le trésor final</h2>
        <div class="field">${chips('lock', lockOpts, h.lock.type)}</div>
        <div id="lockBox"></div>
      </section>

      <section class="card">
        <div class="card-head"><h2 class="card-title">Les étapes</h2><span class="badge" id="stepCount"></span></div>
        <div id="steps" class="step-list"></div>
        <div class="row wrap">
          <button class="btn small primary" id="addStep">＋ Ajouter une étape</button>
          <button class="btn small" id="addLib">📚 Depuis la bibliothèque</button>
          <a class="btn small" id="mapBtn" href="#/edit/${h.id}/carte">🗺️ Carte du parcours</a>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title">Options</h2>
        <div class="field"><span>Nombre d'équipes</span>${chips('teams', teamOpts, h.teams, { small: true })}</div>
        <div id="stagBox">${toggle('stag', 'Ordres décalés', h.staggered, 'Chaque équipe commence par une étape différente. Toutes finissent par la dernière.')}</div>
        <div class="field"><span>Les indices se débloquent après (secondes)</span>
          <div class="row three">${h.hintDelays.map((d, i) => `<label class="mini"><small>Indice ${i + 1}</small><input type="number" min="0" max="900" step="5" data-hd="${i}" value="${d}"></label>`).join('')}</div>
        </div>
        <div id="gpsOpts">
          <div class="field"><span>Guidage GPS</span>${chips('nav', NAVS, h.nav, { small: true })}</div>
          <div class="field"><span>Zone de jeu</span>
            <p class="help" id="zoneTxt"></p>
            <a class="btn small" href="#/edit/${h.id}/carte">Définir sur la carte</a>
          </div>
        </div>
      </section>

      <section class="card issues" id="issues"></section>

      <div class="bottom-bar">
        <a class="btn" href="#/depart/${h.id}/test">🧪 Tester</a>
        <a class="btn" href="#/imprimer/${h.id}" id="printBtn">🖨️ QR</a>
        <a class="btn primary" href="#/partager/${h.id}">📤 Lancer</a>
      </div>
    </div>`;

  const $ = s => app.querySelector(s);

  $('#name').oninput = e => { h.name = e.target.value; save(); };
  $('#intro').oninput = e => { h.intro = e.target.value; save(); };
  $('#finale').oninput = e => { h.finale = e.target.value; save(); };

  bindChips(app, 'theme', v => { h.theme = v; save(); });
  bindChips(app, 'age', v => {
    h.age = v;
    h.hintDelays = [...HINT_DELAYS[v]];
    app.querySelectorAll('[data-hd]').forEach((inp, i) => { inp.value = h.hintDelays[i]; });
    save();
  });
  bindChips(app, 'mode', v => {
    h.mode = v;
    $('#modeDesc').textContent = MODES[v].desc;
    const def = v === 'gps' ? 'gps' : v === 'mixte' ? 'gpsqr' : 'qr';
    if (h.steps.length && h.steps.some(s => s.validate !== def)) {
      toast(`Les nouvelles étapes utiliseront « ${VALIDATIONS[def].label} ». Les étapes existantes gardent leur réglage.`);
    }
    save(); drawSteps(); drawGps();
  });
  bindChips(app, 'lock', v => {
    h.lock.type = v;
    if (v === 'code' && !/^\d+$/.test(h.lock.value)) h.lock.value = randomDigits(4);
    if (v === 'mot' && !/^[A-Za-zÀ-ÿ]+$/.test(h.lock.value)) h.lock.value = 'TRESOR';
    save(); drawLock(); drawSteps();
  });
  bindChips(app, 'teams', v => { h.teams = +v; save(); drawStag(); });
  bindChips(app, 'nav', v => { h.nav = v; save(); });
  $('#stag').onchange = e => { h.staggered = e.target.checked; save(); };
  app.querySelectorAll('[data-hd]').forEach(inp => inp.oninput = () => {
    h.hintDelays[+inp.dataset.hd] = Math.max(0, +inp.value || 0);
    save();
  });

  function drawLock() {
    const box = $('#lockBox');
    const l = h.lock;
    if (l.type === 'aucun') {
      box.innerHTML = '<p class="help">Pas de code à récolter : chaque étape donne une étoile, et le message final dit où est le trésor.</p>';
      return;
    }
    box.innerHTML = `
      <label class="field"><span>${l.type === 'code' ? 'Le code de ton cadenas' : 'Le mot mystère'}</span>
        <div class="input-row">
          <input id="lockVal" class="code-input" value="${esc(l.value)}" maxlength="${l.type === 'code' ? 8 : 12}" ${l.type === 'code' ? 'inputmode="numeric"' : 'autocapitalize="characters"'}>
          ${l.type === 'code' ? '<button class="icon-btn" id="rnd" aria-label="Code au hasard">🎲</button>' : ''}
        </div>
      </label>
      ${l.type === 'code' ? toggle('real', 'J\'ai un vrai cadenas à code', l.real, l.real ? 'Les enfants récoltent les chiffres puis ouvrent le vrai coffre.' : 'Les enfants ouvrent un cadenas dans l\'appli, qui révèle le message final.') : '<p class="help">Les lettres sont récoltées dans le désordre : il faudra retrouver le mot à la fin.</p>'}
      <p class="help" id="distrib"></p>`;
    $('#lockVal').oninput = e => {
      h.lock.value = l.type === 'code' ? e.target.value.replace(/\D/g, '') : e.target.value.replace(/[^A-Za-zÀ-ÿ]/g, '').toUpperCase();
      if (e.target.value !== h.lock.value) e.target.value = h.lock.value;
      save(); drawSteps(); drawDistrib();
    };
    $('#rnd')?.addEventListener('click', () => { h.lock.value = randomDigits(h.lock.value.length || 4); $('#lockVal').value = h.lock.value; save(); drawSteps(); drawDistrib(); });
    $('#real')?.addEventListener('change', e => { h.lock.real = e.target.checked; save(); drawLock(); });
    drawDistrib();
  }
  function drawDistrib() {
    const el = $('#distrib');
    if (!el) return;
    const n = h.steps.length, m = String(h.lock.value).length;
    el.textContent = !n ? '' : m > n
      ? `${m} caractères pour ${n} étapes : certaines étapes en donneront plusieurs.`
      : m < n ? `${m} caractères pour ${n} étapes : les autres étapes donnent une étoile.` : 'Un caractère par étape.';
  }

  function drawStag() {
    $('#stagBox').hidden = h.teams < 2;
  }
  function drawGps() {
    const show = h.mode !== 'qr' || needsGps(h);
    $('#gpsOpts').hidden = !show;
    $('#mapBtn').hidden = !show;
    $('#zoneTxt').textContent = h.zone ? `Cercle de ${Math.round(h.zone.r)} m. Une alerte sonne si une équipe en sort.` : 'Aucune. Tu peux tracer un cercle : une alerte sonne si une équipe en sort.';
  }

  function stepSummary(s) {
    const c = s.challenge;
    return (s.title || s.clue || 'Étape sans titre').slice(0, 70);
  }

  function drawSteps() {
    const rw = rewardMap(h);
    $('#stepCount').textContent = h.steps.length;
    $('#printBtn').hidden = !h.steps.some(s => s.validate === 'qr' || s.validate === 'gpsqr');
    if (!h.steps.length) {
      $('#steps').innerHTML = '<p class="muted">Aucune étape. Ajoute la première !</p>';
      drawDistrib();
      return;
    }
    $('#steps').innerHTML = h.steps.map((s, i) => {
      const rr = rw[s.id] || [];
      const gpsMissing = (s.validate === 'gps' || s.validate === 'gpsqr') && s.lat == null;
      return `
        <div class="step-item">
          <span class="step-num">${i + 1}</span>
          <a class="step-main" href="#/edit/${h.id}/s/${s.id}">
            <b>${esc(stepSummary(s))}</b>
            <small>${VALIDATIONS[s.validate].emoji} ${s.challenge.type !== 'aucun' ? CHALLENGES[s.challenge.type].emoji + ' ' : ''}${rr.length ? `🔑 ${rr.map(r => esc(r.ch)).join(' ')}` : '⭐'}${gpsMissing ? ' <span class="warn">📍 à placer</span>' : ''}</small>
          </a>
          <div class="step-move">
            <button class="mini-btn" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Monter">▲</button>
            <button class="mini-btn" data-down="${i}" ${i === h.steps.length - 1 ? 'disabled' : ''} aria-label="Descendre">▼</button>
          </div>
        </div>`;
    }).join('');
    $('#steps').querySelectorAll('[data-up],[data-down]').forEach(b => b.onclick = () => {
      const i = +(b.dataset.up ?? b.dataset.down), j = b.dataset.up != null ? i - 1 : i + 1;
      [h.steps[i], h.steps[j]] = [h.steps[j], h.steps[i]];
      save(); drawSteps();
    });
    drawDistrib();
  }

  function refreshIssues() {
    const issues = checkHunt(h);
    const box = $('#issues');
    if (!box) return;
    box.className = 'card issues ' + (issues.some(i => i.level === 'error') ? 'bad' : issues.length ? 'warn' : 'ok');
    box.innerHTML = issues.length
      ? `<h2 class="card-title">À compléter</h2><ul>${issues.map(i => `<li>${i.level === 'error' ? '⛔' : '⚠️'} ${i.step ? `<a href="#/edit/${h.id}/s/${i.step}">${esc(i.text)}</a>` : esc(i.text)}</li>`).join('')}</ul>`
      : '<h2 class="card-title">✅ La chasse est prête !</h2><p>Teste-la, imprime les QR codes, puis lance-la.</p>';
  }

  const addStep = async (challenge = null) => {
    const s = newStep(h);
    if (challenge) s.challenge = { ...s.challenge, ...challenge };
    h.steps.push(s);
    await saveHunt(h);
    go(`edit/${h.id}/s/${s.id}`);
  };
  $('#addStep').onclick = () => addStep();
  $('#addLib').onclick = async () => {
    const r = await pickRiddle(h.age);
    if (r) addStep(r);
  };

  drawLock(); drawSteps(); drawStag(); drawGps(); refreshIssues();
  return () => { clearTimeout(saveT); saveHunt(h); };
}
