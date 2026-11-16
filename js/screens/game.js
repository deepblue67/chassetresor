// L'écran de jeu : de l'indice au trésor.
import { loadGame, saveGame, clearGame, photosDb, settings, setSetting } from '../store.js';
import { $, esc, nl2br, answerMatches, fmtDuration, pickImage, resizeImage, holdButton, dialog, confirmDialog, toast, sleep, shuffle } from '../util.js';
import { theme, applyTheme } from '../themes.js';
import { sfx, speak, stopSpeaking, canSpeak } from '../audio.js';
import { currentStep, stepNumber, setPhase, completeStep, nextStep, finish, checkScan, takePendingScan, totalHints, stars } from '../game.js';
import { openScanner } from '../qr.js';
import { mountRadar } from '../radar.js';
import { confetti } from '../fx.js';
import { go } from '../app.js';
import { empty } from '../ui.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default async function gameScreen(app) {
  let g = loadGame();
  if (!g || !g.hunt) {
    app.innerHTML = `<div class="page">${empty('🗺️', 'Aucune partie en cours', 'Lance une chasse depuis l\'écran Jouer.', '<a class="btn primary" href="#/jouer">Jouer</a>')}</div>`;
    return;
  }
  const hunt = g.hunt;
  const th = theme(hunt.theme);
  const little = hunt.age === '4-6';
  applyTheme(hunt.theme);

  let clean = [];
  const onClean = f => clean.push(f);
  const runClean = () => { clean.forEach(f => { try { f(); } catch (e) { console.warn(e); } }); clean = []; stopSpeaking(); };

  app.innerHTML = `
    <div class="game">
      <header class="game-top">
        <div class="team-badge" ${g.teamColor ? `style="--team:${g.teamColor}"` : ''}><span class="team-dot"></span>${esc(g.teamName || th.words.team)}</div>
        <div class="timer" id="timer" aria-label="Temps écoulé"></div>
        <button class="icon-btn" id="menu" aria-label="Menu">⋯</button>
      </header>
      <nav class="trail" id="trail" aria-label="Progression"></nav>
      <main class="stage" id="stage"></main>
      ${g.test ? '<div class="test-ribbon">Mode test</div>' : ''}
    </div>`;
  const stage = $('#stage', app);

  // --- Chrono ---
  const tick = () => {
    const el = $('#timer', app);
    if (!el) return;
    if (!g.startedAt) { el.textContent = '⏱ 0 min 00'; return; }
    el.textContent = '⏱ ' + fmtDuration((g.finishedAt || Date.now()) - g.startedAt);
  };
  const timer = setInterval(tick, 1000);
  tick();

  // --- Garder l'écran allumé pendant la partie ---
  let wakeLock = null;
  const lock = async () => { try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* non supporté */ } };
  const onVis = () => { if (document.visibilityState === 'visible') lock(); };
  lock();
  document.addEventListener('visibilitychange', onVis);

  $('#menu', app).onclick = () => openMenu();

  function trailHtml() {
    return g.order.map((id, i) => {
      const done = g.done.includes(id);
      const cur = i === g.pos && g.phase !== 'final' && g.phase !== 'done';
      const last = i === g.order.length - 1;
      return `<span class="trail-dot ${done ? 'done' : ''} ${cur ? 'cur' : ''}" title="${th.words.step} ${i + 1}">${cur ? th.pin : done ? '✓' : i + 1}</span>${last ? '' : '<span class="trail-line"></span>'}`;
    }).join('') + `<span class="trail-line"></span><span class="trail-dot chest ${g.phase === 'done' ? 'done' : ''} ${g.phase === 'final' ? 'cur' : ''}">💰</span>`;
  }

  function render() {
    runClean();
    $('#trail', app).innerHTML = trailHtml();
    $('.game', app).dataset.phase = g.phase;
    stage.classList.remove('pop');
    void stage.offsetWidth;
    stage.classList.add('pop');
    window.scrollTo(0, 0);
    ({ intro: renderIntro, nav: renderNav, challenge: renderChallenge, reward: renderReward, final: renderFinal, done: renderDone })[g.phase]?.();
    tick();
  }

  const speakBtn = text => canSpeak() && text ? `<button class="icon-btn speak" data-speak="${esc(text)}" aria-label="Lire à voix haute">🔊</button>` : '';
  stage.addEventListener('click', e => {
    const b = e.target.closest('[data-speak]');
    if (b) speak(b.dataset.speak, { force: true });
  });

  // ---------- Compte à rebours ----------
  function renderIntro() {
    stage.innerHTML = `<div class="countdown"><div class="count-num" id="cn">3</div><p>${esc(th.words.start)}</p></div>`;
    let alive = true;
    onClean(() => { alive = false; });
    (async () => {
      for (const n of ['3', '2', '1']) {
        if (!alive) return;
        const el = $('#cn', stage);
        el.textContent = n;
        el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
        sfx.radar(2);
        await sleep(800);
      }
      if (!alive) return;
      $('#cn', stage).textContent = 'Go !';
      sfx.coin();
      await sleep(600);
      if (!alive) return;
      setPhase(g, 'nav');
      render();
    })();
  }

  // ---------- Trouver l'endroit ----------
  function renderNav() {
    const s = currentStep(g);
    const n = stepNumber(g), total = g.order.length;
    const geoTarget = (s.validate === 'gps' || s.validate === 'gpsqr') && s.lat != null;
    let v = s.validate;
    if ((v === 'gps' || v === 'gpsqr') && !geoTarget) v = v === 'gps' ? 'aucune' : 'qr';
    const clue = s.clue || 'Cherchez le prochain indice !';

    stage.innerHTML = `
      <section class="card clue-card">
        <div class="step-label">${esc(th.words.step)} ${n} sur ${total}</div>
        ${s.title ? `<h2 class="step-title">${esc(s.title)}</h2>` : ''}
        <div class="clue"><p class="clue-text">${nl2br(clue)}</p>${speakBtn(clue)}</div>
        ${s.cluePhoto ? `<img class="clue-photo" src="${s.cluePhoto}" alt="Photo de l'indice">` : ''}
        ${s.clueHint ? '<div class="loc-hint" id="locHint"></div>' : ''}
      </section>
      ${geoTarget ? '<section class="card radar-card" id="radar"></section>' : ''}
      <div class="actions">
        ${v === 'qr' || v === 'gpsqr' ? `<button class="btn big primary" id="scanBtn"><span class="btn-emoji">📷</span><span class="btn-text">Scanner le QR code</span></button>` : ''}
        ${v === 'aucune' ? `<button class="btn big primary" id="foundBtn"><span class="btn-emoji">🙌</span><span class="btn-text">On a trouvé !</span></button>` : ''}
        ${g.test && v !== 'aucune' ? `<button class="btn small test" id="simBtn">🧪 Simuler ${v === 'gps' ? 'l\'arrivée' : 'le scan'}</button>` : ''}
      </div>`;

    if (little) speak(clue);
    let found = false;
    const onFound = async () => {
      if (found) return;
      found = true;
      radar?.stop();
      sfx.success();
      await foundBurst();
      if (s.challenge.type === 'aucun') completeStep(g);
      else setPhase(g, 'challenge');
      render();
    };

    let radar = null;
    if (geoTarget) {
      radar = mountRadar($('#radar', stage), {
        target: { lat: s.lat, lng: s.lng }, radius: s.radius || 20, nav: hunt.nav, zone: hunt.zone, test: g.test,
        keepGoingAfterArrive: s.validate === 'gpsqr',
        onArrive: () => {
          if (s.validate === 'gps') onFound();
          else { sfx.success(); toast('Vous êtes dans la zone ! Cherchez le QR code.'); }
        },
        onZoneExit: zoneAlert,
      });
      onClean(() => radar.stop());
    }

    $('#scanBtn', stage)?.addEventListener('click', async () => {
      const ok = await openScanner({ title: `${th.words.step} ${n} : scanne le QR`, accept: t => checkScan(g, t) });
      if (ok) onFound();
    });
    $('#foundBtn', stage)?.addEventListener('click', onFound);
    $('#simBtn', stage)?.addEventListener('click', () => { if (v === 'gps') radar?.simulateArrive(); else onFound(); });

    // Coup de pouce pour trouver l'endroit
    if (s.clueHint) {
      const box = $('#locHint', stage);
      const delay = (hunt.hintDelays[1] || 90) * 1000;
      const upd = () => {
        if (g.locHints[s.id]) { box.innerHTML = `<p class="hint-shown">💡 ${nl2br(s.clueHint)}</p>`; return true; }
        const left = g.phaseStartedAt + delay - Date.now();
        if (left > 0) box.innerHTML = `<button class="hint-btn locked" disabled><span>💡 Coup de pouce</span><small>dans ${fmtDuration(left)}</small></button>`;
        else box.innerHTML = `<button class="hint-btn ready" id="lh"><span>💡 Coup de pouce</span><small>Touchez pour l'afficher</small></button>`;
        $('#lh', box)?.addEventListener('click', () => { g.locHints[s.id] = true; saveGame(g); sfx.hint(); speak(s.clueHint); upd(); });
        return false;
      };
      if (!upd()) { const t = setInterval(() => { if (upd()) clearInterval(t); }, 1000); onClean(() => clearInterval(t)); }
    }

    // Un QR scanné avec l'appareil photo du téléphone
    const pending = takePendingScan();
    if (pending) {
      const r = checkScan(g, pending);
      if (r === true) setTimeout(onFound, 300);
      else toast(r, 'bad');
    }
  }

  function foundBurst() {
    return new Promise(resolve => {
      const el = document.createElement('div');
      el.className = 'found-burst';
      el.innerHTML = `<div><span>${th.mascot}</span><b>${esc(th.words.found)}</b></div>`;
      document.body.appendChild(el);
      confetti({ count: 70, emojis: th.deco, duration: 1600 });
      setTimeout(() => { el.classList.add('out'); }, 1200);
      setTimeout(() => { el.remove(); resolve(); }, 1450);
    });
  }

  function zoneAlert() {
    sfx.alarm();
    dialog({ title: '⛔ Hors de la zone de jeu', body: '<p>Revenez vers la zone de jeu et attendez un adulte.</p>', actions: [{ label: 'Compris', primary: true, value: true }] });
  }

  // ---------- Le défi ----------
  function renderChallenge() {
    const s = currentStep(g);
    const c = s.challenge;
    const n = stepNumber(g);
    let area = '';
    if (c.type === 'texte' || c.type === 'nombre') {
      area = `<form class="answer-form" id="af" autocomplete="off">
        <input id="ans" ${c.type === 'nombre' ? 'inputmode="numeric" pattern="[0-9]*"' : 'autocapitalize="off" spellcheck="false"'} placeholder="${c.type === 'nombre' ? 'Ton nombre' : 'Ta réponse'}" aria-label="Réponse" enterkeyhint="done">
        <button class="btn primary">Valider</button>
      </form>`;
    } else if (c.type === 'qcm') {
      area = `<div class="choices">${c.choices.map((ch, i) => ch ? `<button class="choice" data-i="${i}"><span class="choice-letter">${LETTERS[i]}</span><span>${esc(ch)}</span></button>` : '').join('')}</div>`;
    } else if (c.type === 'photo') {
      area = `<button class="btn big primary" id="photoBtn"><span class="btn-emoji">📸</span><span class="btn-text">Prendre la photo</span></button>`;
    } else if (c.type === 'adulte') {
      area = `<button class="btn big hold" id="holdBtn"><span class="hold-fill"></span><span class="hold-label">✋ Un adulte appuie ici 2 secondes pour valider</span></button>`;
    }
    const readText = c.type === 'qcm' ? `${c.q}. ${c.choices.filter(Boolean).map((x, i) => `${LETTERS[i]} : ${x}`).join('. ')}` : c.q;
    stage.innerHTML = `
      <section class="card challenge-card" id="cc">
        <div class="step-label">${c.type === 'photo' ? 'Défi photo' : c.type === 'adulte' ? 'Défi' : 'Énigme'}, ${esc(th.words.step.toLowerCase())} ${n}</div>
        ${c.emoji ? `<div class="challenge-emoji">${c.emoji}</div>` : ''}
        <div class="clue"><p class="challenge-q">${nl2br(c.q)}</p>${speakBtn(readText)}</div>
        <div class="answer-area">${area}</div>
        <p class="feedback" id="fb" aria-live="assertive"></p>
      </section>
      <section class="hints-wrap" id="hints"></section>`;

    if (little) speak(readText);
    const fb = $('#fb', stage), card = $('#cc', stage);
    const wrong = () => {
      g.wrong++; saveGame(g);
      sfx.wrong();
      fb.textContent = th.words.wrong;
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      if (little) speak(th.words.wrong);
    };
    const right = async () => {
      sfx.success();
      card.classList.add('win');
      await sleep(500);
      completeStep(g);
      render();
    };

    $('#af', stage)?.addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#ans', stage).value;
      if (!v.trim()) return;
      if (answerMatches(v, c.answers)) right(); else { wrong(); $('#ans', stage).select(); }
    });
    stage.querySelectorAll('.choice').forEach(b => b.onclick = () => {
      if (+b.dataset.i === +c.correct) { b.classList.add('good'); right(); }
      else { b.classList.add('bad'); b.disabled = true; wrong(); }
    });
    $('#photoBtn', stage)?.addEventListener('click', async () => {
      const f = await pickImage({ capture: true });
      if (!f) return;
      try {
        const data = await resizeImage(f, 1280, 0.82);
        const key = `${g.key}:${s.id}`;
        await photosDb.set(key, data);
        if (!g.photos.includes(key)) g.photos.push(key);
        saveGame(g);
        $('.answer-area', stage).innerHTML = `<img class="photo-proof" src="${data}" alt="Votre photo">`;
        right();
      } catch { toast('La photo n\'a pas pu être enregistrée.', 'bad'); }
    });
    const hb = $('#holdBtn', stage);
    if (hb) holdButton(hb, 2000, right);

    mountHints(s);
  }

  function mountHints(s) {
    const hints = s.challenge.hints.map((h, i) => ({ h, i })).filter(x => x.h);
    const box = $('#hints', stage);
    if (!hints.length) return;
    const upd = () => {
      const shown = g.hints[s.id] || 0;
      const now = Date.now();
      box.innerHTML = `<h3>Besoin d'aide ?</h3>` + hints.map(({ h, i }, k) => {
        if (k < shown) return `<p class="hint-shown"><b>Indice ${k + 1}</b> ${nl2br(h)}</p>`;
        if (k > shown) return `<button class="hint-btn locked" disabled><span>🔒 Indice ${k + 1}</span></button>`;
        const left = g.phaseStartedAt + (hunt.hintDelays[Math.min(i, 2)] || 60) * 1000 - now;
        return left > 0
          ? `<button class="hint-btn locked" disabled><span>⏳ Indice ${k + 1}</span><small>dans ${fmtDuration(left)}</small></button>`
          : `<button class="hint-btn ready" data-k="${k}"><span>💡 Indice ${k + 1}</span><small>${esc(th.words.hint)}</small></button>`;
      }).join('');
      box.querySelector('[data-k]')?.addEventListener('click', e => {
        const k = +e.currentTarget.dataset.k;
        g.hints[s.id] = k + 1;
        saveGame(g);
        sfx.hint();
        speak(hints[k].h);
        upd();
      });
    };
    upd();
    const t = setInterval(() => { if (!box.querySelector('.hint-btn.ready')) upd(); }, 1000);
    onClean(() => clearInterval(t));
  }

  // ---------- La récompense ----------
  function renderReward() {
    const s = currentStep(g);
    const lock = hunt.lock;
    const mine = g.collected.filter(r => r.stepId === s.id);
    const last = g.pos >= g.order.length - 1;
    let label = th.words.reward, medal = '⭐';
    if (mine.length) {
      medal = mine.map(r => r.ch).join(' ');
      if (lock.type === 'code') label = mine.length === 1 ? `Chiffre n°${mine[0].pos + 1} du code secret` : `Chiffres n°${mine.map(r => r.pos + 1).join(' et ')} du code`;
      else label = mine.length === 1 ? 'Une lettre du mot mystère' : 'Des lettres du mot mystère';
    }
    stage.innerHTML = `
      <section class="reward">
        <h2 class="reward-title">${th.mascot} Bravo !</h2>
        <div class="medal"><div class="medal-inner"><span>${esc(medal)}</span></div></div>
        <p class="reward-label">${esc(label)}</p>
        ${collectedHtml()}
        <button class="btn big primary" id="next">${last ? `Vers ${esc(th.words.chest)} !` : `${esc(th.words.step)} suivante`}</button>
      </section>`;
    setTimeout(() => sfx.coin(), 450);
    confetti({ count: 90, emojis: th.deco });
    if (mine.length) speak(`${label} : ${mine.map(r => r.ch).join(', ')}`);
    $('#next', stage).onclick = () => { sfx.tap(); nextStep(g); render(); };
  }

  function collectedHtml() {
    const lock = hunt.lock;
    if (lock.type === 'code') {
      const len = String(lock.value).length;
      const slots = Array.from({ length: len }, (_, i) => g.collected.find(r => r.pos === i)?.ch ?? null);
      return `<div class="code-slots" aria-label="Code récolté">${slots.map(c => `<span class="slot ${c ? 'got' : ''}">${c ?? '?'}</span>`).join('')}</div>`;
    }
    if (lock.type === 'mot') {
      const len = [...lock.value].length;
      return `<div class="code-slots letters">${g.collected.map(r => `<span class="slot got">${esc(r.ch)}</span>`).join('')}${'<span class="slot">?</span>'.repeat(Math.max(0, len - g.collected.length))}</div>`;
    }
    return '';
  }

  // ---------- Le trésor ----------
  function renderFinal() {
    const lock = hunt.lock;
    if (g.unlocked || lock.type === 'aucun' || (lock.type === 'code' && lock.real)) return renderTreasureHunt();
    if (lock.type === 'code') return renderPadlock();
    return renderWord();
  }

  function unlockedNow() {
    g.unlocked = true;
    saveGame(g);
    sfx.unlock();
    confetti({ count: 160, emojis: ['💰', '🪙', '💎', ...th.deco] });
    setTimeout(render, 1500);
  }

  function renderPadlock() {
    const code = String(hunt.lock.value);
    const vals = Array(code.length).fill(0);
    stage.innerHTML = `
      <section class="final">
        <h2>Ouvrez ${esc(th.words.chest)} !</h2>
        <p>Remettez les chiffres récoltés dans le bon ordre.</p>
        ${collectedHtml()}
        <div class="padlock" id="pad">
          <div class="shackle"></div>
          <div class="lock-body">
            <div class="wheels">${vals.map((_, i) => `
              <div class="wheel" data-w="${i}">
                <button class="wheel-btn" data-d="1" aria-label="Chiffre ${i + 1} plus">▲</button>
                <div class="wheel-num" aria-live="polite">0</div>
                <button class="wheel-btn" data-d="-1" aria-label="Chiffre ${i + 1} moins">▼</button>
              </div>`).join('')}
            </div>
          </div>
        </div>
        <button class="btn big primary" id="open">🔓 Ouvrir</button>
      </section>`;
    stage.querySelectorAll('.wheel').forEach(w => {
      const i = +w.dataset.w, num = w.querySelector('.wheel-num');
      const set = d => { vals[i] = (vals[i] + d + 10) % 10; num.textContent = vals[i]; num.classList.remove('roll'); void num.offsetWidth; num.classList.add('roll'); sfx.click(); };
      w.querySelectorAll('.wheel-btn').forEach(b => b.onclick = () => set(+b.dataset.d));
      // glisser vers le haut ou le bas
      let y0 = null;
      num.addEventListener('pointerdown', e => { y0 = e.clientY; num.setPointerCapture(e.pointerId); });
      num.addEventListener('pointermove', e => { if (y0 == null) return; const dy = e.clientY - y0; if (Math.abs(dy) > 24) { set(dy < 0 ? 1 : -1); y0 = e.clientY; } });
      num.addEventListener('pointerup', () => { y0 = null; });
    });
    $('#open', stage).onclick = () => {
      const pad = $('#pad', stage);
      if (vals.join('') === code) { pad.classList.add('open'); unlockedNow(); }
      else { g.wrong++; saveGame(g); sfx.wrong(); pad.classList.remove('shake'); void pad.offsetWidth; pad.classList.add('shake'); toast('Ce n\'est pas le bon code. Regardez bien les numéros des chiffres !'); }
    };
  }

  function renderWord() {
    const word = [...String(hunt.lock.value).toUpperCase()];
    const tiles = shuffle(g.collected.map((r, i) => ({ ch: r.ch, id: i })));
    const placed = [];
    stage.innerHTML = `
      <section class="final">
        <h2>Le mot mystère</h2>
        <p>Remettez les lettres dans l'ordre pour ouvrir ${esc(th.words.chest)}.</p>
        <div class="word-slots" id="slots"></div>
        <div class="word-tiles" id="tiles"></div>
        <button class="btn small" id="reset">↺ Recommencer</button>
      </section>`;
    const draw = () => {
      $('#slots', stage).innerHTML = word.map((_, i) => `<button class="slot big ${placed[i] ? 'got' : ''}" data-s="${i}">${placed[i] ? esc(placed[i].ch) : ''}</button>`).join('');
      $('#tiles', stage).innerHTML = tiles.map(t => `<button class="tile" data-t="${t.id}" ${placed.includes(t) ? 'disabled' : ''}>${esc(t.ch)}</button>`).join('');
    };
    draw();
    const onTile = e => {
      if (g.phase !== 'final' || g.unlocked) return;
      const t = e.target.closest('.tile'), sl = e.target.closest('[data-s]');
      if (t && !t.disabled) {
        const tile = tiles.find(x => x.id === +t.dataset.t);
        const idx = word.findIndex((_, i) => !placed[i]);
        if (idx < 0) return;
        placed[idx] = tile; sfx.click(); draw();
        if (placed.filter(Boolean).length === word.length) {
          if (placed.map(p => p.ch).join('') === word.join('')) { $('#slots', stage).classList.add('win'); unlockedNow(); }
          else { sfx.wrong(); g.wrong++; saveGame(g); $('#slots', stage).classList.add('shake'); setTimeout(() => { placed.length = 0; draw(); }, 700); }
        }
      } else if (sl && placed[+sl.dataset.s]) { placed[+sl.dataset.s] = undefined; sfx.tap(); draw(); }
    };
    stage.addEventListener('click', onTile);
    onClean(() => stage.removeEventListener('click', onTile));
    $('#reset', stage).onclick = () => { placed.length = 0; draw(); };
  }

  function renderTreasureHunt() {
    const lock = hunt.lock;
    const showCode = lock.type === 'code' && lock.real;
    stage.innerHTML = `
      <section class="final">
        ${g.unlocked ? `<div class="padlock open static"><div class="shackle"></div><div class="lock-body"><span>🔓</span></div></div><h2>C'est ouvert !</h2>` : `<h2>Dernière ligne droite !</h2>`}
        ${showCode ? `<p>Votre code secret pour ouvrir le vrai cadenas :</p><div class="code-ticket">${[...String(lock.value)].map(c => `<span>${c}</span>`).join('')}</div>` : ''}
        ${hunt.finale ? `<div class="card story"><div class="clue"><p>${nl2br(hunt.finale)}</p>${speakBtn(hunt.finale)}</div></div>` : `<p>Cherchez ${esc(th.words.chest)} !</p>`}
        <button class="btn big primary" id="got">${showCode ? '🎉 Le coffre est ouvert !' : `🎉 On a trouvé ${esc(th.words.treasure)} !`}</button>
      </section>`;
    if (hunt.finale) speak(hunt.finale);
    $('#got', stage).onclick = () => { finish(g); render(); };
  }

  // ---------- Victoire ----------
  async function renderDone() {
    const dur = (g.finishedAt || Date.now()) - (g.startedAt || g.finishedAt || Date.now());
    const st = stars(g);
    stage.innerHTML = `
      <section class="victory">
        <div class="trophy">🏆</div>
        <h2>${esc(th.words.finish)}</h2>
        <p class="team-name">${esc(g.teamName)}</p>
        <div class="stars" aria-label="${st} étoiles sur 3">${[1, 2, 3].map(i => `<span class="${i <= st ? 'on' : ''}">★</span>`).join('')}</div>
        <div class="stats">
          <div><b>${fmtDuration(dur)}</b><small>de chasse</small></div>
          <div><b>${totalHints(g)}</b><small>indice${totalHints(g) > 1 ? 's' : ''}</small></div>
          <div><b>${g.order.length}</b><small>${esc(th.words.step.toLowerCase())}s</small></div>
        </div>
        <div class="photo-grid" id="photos"></div>
        <div class="stack">
          <button class="btn big primary" id="dip"><span class="btn-emoji">🎓</span><span class="btn-text">Voir le diplôme</span></button>
          <button class="btn" id="souv">📸 Prendre la photo souvenir</button>
          <div class="row">
            <a class="btn small" href="#/">Accueil</a>
            <button class="btn small" id="again">Rejouer</button>
          </div>
        </div>
      </section>`;
    if (!g.celebrated) {
      g.celebrated = true; saveGame(g);
      sfx.fanfare();
      confetti({ count: 200, emojis: ['🏆', '⭐', ...th.deco], duration: 3500 });
    }
    const keys = [`${g.key}:souvenir`, ...g.photos];
    const photos = (await Promise.all(keys.map(k => photosDb.get(k).catch(() => null)))).filter(Boolean);
    $('#photos', stage).innerHTML = photos.map(p => `<img src="${p}" alt="Photo de la partie">`).join('');
    $('#souv', stage).onclick = async () => {
      const f = await pickImage({ capture: true });
      if (!f) return;
      await photosDb.set(`${g.key}:souvenir`, await resizeImage(f, 1280, 0.85));
      sfx.coin();
      renderDone();
    };
    $('#dip', stage).onclick = async () => (await import('../diploma.js')).showDiploma(g);
    $('#again', stage).onclick = () => go(`depart/${g.huntId}`);
  }

  // ---------- Menu et espace adulte ----------
  async function openMenu() {
    const s = settings();
    const r = await dialog({
      title: 'Menu',
      body: `
        <div class="menu-list">
          <button class="menu-item" data-m="sound">${s.sound ? '🔊 Son activé' : '🔇 Son coupé'}</button>
          <button class="menu-item" data-m="voice">${s.voice ? '🗣️ Lecture à voix haute activée' : '🤐 Lecture à voix haute coupée'}</button>
          <button class="menu-item hold" id="adultHold"><span class="hold-fill"></span><span class="hold-label">🔒 Espace adulte (maintenir 1 s)</span></button>
        </div>`,
      actions: [{ label: 'Fermer', value: null }],
      dismissable: true,
    });
    if (r === 'adult') adultMenu();
  }
  document.addEventListener('click', menuClicks);
  function menuClicks(e) {
    const m = e.target.closest('.menu-item[data-m]');
    if (!m) return;
    const key = m.dataset.m;
    const v = !settings()[key];
    setSetting(key, v);
    if (key === 'voice' && !v) stopSpeaking();
    m.textContent = key === 'sound' ? (v ? '🔊 Son activé' : '🔇 Son coupé') : (v ? '🗣️ Lecture à voix haute activée' : '🤐 Lecture à voix haute coupée');
    sfx.tap();
  }
  const obs = new MutationObserver(() => {
    const h = document.getElementById('adultHold');
    if (h && !h.dataset.bound) {
      h.dataset.bound = '1';
      holdButton(h, 1000, () => {
        h.closest('.dialog-wrap')?.querySelector('.dialog-actions .btn')?.click();
        setTimeout(adultMenu, 220);
      });
    }
  });
  obs.observe(document.body, { childList: true });

  async function adultMenu() {
    const s = currentStep(g);
    const c = s?.challenge;
    const opts = [];
    if (g.phase === 'nav') opts.push({ label: '⏭️ Valider cette étape (débloquer)', value: 'skipnav' });
    if (g.phase === 'challenge') {
      opts.push({ label: '👀 Voir la réponse', value: 'answer' });
      opts.push({ label: '💡 Débloquer tous les indices', value: 'hints' });
      opts.push({ label: '⏭️ Valider le défi', value: 'skipchal' });
    }
    if (g.phase === 'final') opts.push({ label: '👀 Voir le code / le mot', value: 'code' });
    opts.push({ label: '🔁 Recommencer la partie', value: 'restart' });
    opts.push({ label: '🚪 Quitter la partie', value: 'quit' });
    const r = await dialog({
      title: 'Espace adulte',
      body: `<p class="small">${esc(hunt.name)}, ${esc(th.words.step.toLowerCase())} ${stepNumber(g)} sur ${g.order.length}${s?.title ? ` (${esc(s.title)})` : ''}</p>`,
      actions: [...opts, { label: 'Fermer', value: null }],
    });
    if (r === 'skipnav') { if (s.challenge.type === 'aucun') completeStep(g); else setPhase(g, 'challenge'); render(); }
    if (r === 'skipchal') { completeStep(g); render(); }
    if (r === 'hints') { g.phaseStartedAt = 0; saveGame(g); render(); }
    if (r === 'answer') {
      const ans = c.type === 'qcm' ? c.choices[c.correct] : (c.answers || [])[0] || 'Pas de réponse à saisir : validez le défi.';
      dialog({ title: 'Réponse', body: `<p class="big-answer">${esc(ans)}</p>` });
    }
    if (r === 'code') dialog({ title: 'Solution', body: `<p class="big-answer">${esc(hunt.lock.value)}</p>` });
    if (r === 'restart' && await confirmDialog('Recommencer ?', 'La partie repart de la première étape.', 'Recommencer', true)) {
      Object.assign(g, { pos: 0, phase: 'intro', startedAt: null, finishedAt: null, hints: {}, locHints: {}, wrong: 0, collected: [], done: [], unlocked: false, celebrated: false });
      saveGame(g); render();
    }
    if (r === 'quit' && await confirmDialog('Quitter la partie ?', 'La progression de cette partie sera effacée.', 'Quitter', true)) {
      clearGame(); go('');
    }
  }

  render();

  return () => {
    runClean();
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVis);
    document.removeEventListener('click', menuClicks);
    obs.disconnect();
    wakeLock?.release?.().catch(() => {});
  };
}
