import { loadGame } from '../store.js';
import { esc } from '../util.js';
import { toggleSound, sfx } from '../audio.js';
import { settings } from '../store.js';
import { canInstall, install, isStandalone } from '../app.js';
import { theme } from '../themes.js';

export const CHEST_SVG = `
<svg class="chest" viewBox="0 0 220 180" aria-hidden="true">
  <ellipse cx="110" cy="166" rx="86" ry="10" fill="rgba(0,0,0,.18)"/>
  <g class="chest-glow"><circle cx="110" cy="84" r="58" fill="#fff3b0" opacity=".85"/></g>
  <g class="chest-coins">
    <circle cx="78" cy="78" r="13" fill="#ffd65a" stroke="var(--line)" stroke-width="4"/>
    <circle cx="110" cy="66" r="14" fill="#ffd65a" stroke="var(--line)" stroke-width="4"/>
    <circle cx="142" cy="78" r="13" fill="#ffd65a" stroke="var(--line)" stroke-width="4"/>
    <path d="M110 58v16M78 71v14M142 71v14" stroke="#e0a500" stroke-width="3" stroke-linecap="round"/>
  </g>
  <g class="chest-body">
    <rect x="30" y="84" width="160" height="78" rx="10" fill="#c8733c" stroke="var(--line)" stroke-width="5"/>
    <rect x="30" y="104" width="160" height="14" fill="#a85a2a" stroke="var(--line)" stroke-width="4"/>
    <rect x="52" y="84" width="16" height="78" fill="#ffc43d" stroke="var(--line)" stroke-width="4"/>
    <rect x="152" y="84" width="16" height="78" fill="#ffc43d" stroke="var(--line)" stroke-width="4"/>
    <rect x="94" y="98" width="32" height="38" rx="6" fill="#ffc43d" stroke="var(--line)" stroke-width="4"/>
    <circle cx="110" cy="113" r="5" fill="var(--line)"/><rect x="108" y="113" width="4" height="12" fill="var(--line)"/>
  </g>
  <g class="chest-lid">
    <path d="M30 84 V62 Q30 28 110 28 Q190 28 190 62 V84 Z" fill="#d9844a" stroke="var(--line)" stroke-width="5" stroke-linejoin="round"/>
    <path d="M52 84 V40 M168 84 V40" stroke="var(--line)" stroke-width="4"/>
    <path d="M52 84 V38 Q56 34 68 32 V84 Z M152 84 V32 Q164 34 168 38 V84 Z" fill="#ffc43d" stroke="var(--line)" stroke-width="4" stroke-linejoin="round"/>
  </g>
  <g class="sparkles" fill="#fff">
    <path d="M40 30 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z"/>
    <path d="M182 18 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/>
    <path d="M196 70 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z"/>
  </g>
</svg>`;

export default function home(app) {
  const g = loadGame();
  const ongoing = g && g.phase !== 'done' && g.hunt;
  const sound = settings().sound;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  app.innerHTML = `
    <div class="page home">
      <div class="home-tools">
        <button class="icon-btn" id="snd" aria-label="Son">${sound ? '🔊' : '🔇'}</button>
      </div>
      <div class="hero">
        ${CHEST_SVG}
        <h1 class="logo">Chasse<br>au trésor</h1>
        <p class="tagline">Énigmes, QR codes cachés et radar GPS pour jouer en famille ou entre amis.</p>
      </div>

      <div class="home-actions">
        ${ongoing ? `
          <a class="btn big resume" href="#/partie">
            <span class="btn-emoji">${theme(g.hunt.theme).emoji}</span>
            <span class="btn-text">Reprendre la partie<small>${esc(g.hunt.name)}, ${g.phase === 'final' ? 'le trésor !' : `étape ${Math.min(g.pos + 1, g.order.length)} sur ${g.order.length}`}</small></span>
          </a>` : ''}
        <a class="btn big primary" href="#/jouer"><span class="btn-emoji">🎯</span><span class="btn-text">Jouer<small>Scanner une chasse ou en lancer une</small></span></a>
        <a class="btn big" href="#/org"><span class="btn-emoji">🗺️</span><span class="btn-text">Organiser une chasse<small>Créer, imprimer les QR, partager</small></span></a>
      </div>

      <div class="home-foot">
        <a href="#/aide" class="link">Comment ça marche ?</a>
        <button class="link" id="inst" hidden>📲 Installer l'appli</button>
      </div>
      ${!isStandalone() && isIos ? `<p class="ios-tip">Sur iPhone : touche <b>Partager</b> puis <b>Sur l'écran d'accueil</b> pour installer l'appli.</p>` : ''}
    </div>`;

  app.querySelector('#snd').onclick = e => {
    const v = toggleSound();
    e.currentTarget.textContent = v ? '🔊' : '🔇';
    sfx.coin();
  };
  const inst = app.querySelector('#inst');
  const showInst = () => { inst.hidden = !canInstall(); };
  showInst();
  document.addEventListener('can-install', showInst);
  inst.onclick = () => install().then(showInst);
  return () => document.removeEventListener('can-install', showInst);
}
