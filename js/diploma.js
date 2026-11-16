// Diplôme de fin de chasse, dessiné sur un canvas : à partager, télécharger ou imprimer.
import { theme } from './themes.js';
import { photosDb } from './store.js';
import { fmtDuration, download, esc, toast, slug } from './util.js';
import { totalHints, stars } from './game.js';

function loadImg(src) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function fitText(ctx, text, maxW, size, weight = 700, family = 'Fredoka') {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${family}, system-ui, sans-serif`; s -= 4; } while (ctx.measureText(text).width > maxW && s > 20);
}

export async function drawDiploma(g) {
  const th = theme(g.hunt.theme);
  const c = th.colors;
  const W = 2000, H = 1414;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  await Promise.all(['700 100px Fredoka', '600 60px Fredoka', '700 40px Nunito', '600 40px Nunito'].map(f => document.fonts.load(f).catch(() => {})));

  const dark = th.id === 'espions';
  const paper = dark ? '#f4f1ff' : '#fffdf6';
  const ink = dark ? '#1f2133' : c.ink;

  // fond à pois
  ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = c.bg2;
  for (let y = 20; y < H; y += 56) for (let x = (y / 56 % 2) * 28 + 20; x < W; x += 56) { ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); }

  // feuille
  ctx.fillStyle = ink; roundRect(ctx, 90, 104, W - 180, H - 190, 46); ctx.fill();
  ctx.fillStyle = paper; roundRect(ctx, 80, 80, W - 180, H - 190, 46); ctx.fill();
  ctx.lineWidth = 10; ctx.strokeStyle = ink; ctx.stroke();
  ctx.setLineDash([18, 16]); ctx.lineWidth = 5; ctx.strokeStyle = c.accent;
  roundRect(ctx, 120, 120, W - 260, H - 270, 30); ctx.stroke(); ctx.setLineDash([]);

  // décor
  ctx.font = '110px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  [[200, 220], [W - 280, 220], [200, H - 260], [W - 280, H - 260]].forEach(([x, y], i) => ctx.fillText(th.deco[i % th.deco.length], x, y));

  const left = 260, colW = 940;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = c.accent2;
  fitText(ctx, th.words.diploma, colW, 104);
  ctx.fillText(th.words.diploma, left, 330);

  ctx.fillStyle = ink;
  ctx.font = '600 44px Nunito, system-ui, sans-serif';
  ctx.fillText('décerné à', left, 430);

  // nom d'équipe sur un bandeau
  const team = g.teamName || th.words.team;
  fitText(ctx, team, colW - 60, 120);
  const tw = Math.min(colW, ctx.measureText(team).width + 80);
  ctx.fillStyle = c.accent; roundRect(ctx, left - 30, 465, tw, 150, 28); ctx.fill();
  ctx.lineWidth = 7; ctx.strokeStyle = ink; ctx.stroke();
  ctx.fillStyle = dark ? '#14162a' : c.onAccent;
  ctx.fillText(team, left + 10, 580);

  ctx.fillStyle = ink;
  ctx.font = '600 46px Nunito, system-ui, sans-serif';
  const lines = wrap(ctx, `pour avoir retrouvé ${th.words.treasure} dans la chasse « ${g.hunt.name} ».`, colW);
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, left, 700 + i * 62));

  // stats
  const dur = fmtDuration((g.finishedAt || Date.now()) - (g.startedAt || Date.now()));
  const hints = totalHints(g);
  const statY = 950;
  [['⏱', dur], ['💡', `${hints} indice${hints > 1 ? 's' : ''}`], ['🧩', `${g.order.length} étapes`]].forEach(([e, t], i) => {
    const x = left + i * 340;
    ctx.font = '64px serif'; ctx.fillText(e, x, statY);
    ctx.font = '700 46px Fredoka, system-ui, sans-serif'; ctx.fillText(t, x + 84, statY - 6);
  });
  // étoiles
  const st = stars(g);
  ctx.font = '700 110px Fredoka, system-ui, sans-serif';
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < st ? '#ffc43d' : 'rgba(0,0,0,.12)';
    ctx.fillText('★', left + i * 120, 1120);
    if (i < st) { ctx.lineWidth = 5; ctx.strokeStyle = ink; ctx.strokeText('★', left + i * 120, 1120); }
  }
  ctx.fillStyle = ink;
  ctx.font = '600 38px Nunito, system-ui, sans-serif';
  ctx.fillText(new Date(g.finishedAt || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), left + 400, 1100);

  // photo polaroïd
  const photoKey = [`${g.key}:souvenir`, ...g.photos.slice().reverse()];
  let photo = null;
  for (const k of photoKey) { const d = await photosDb.get(k).catch(() => null); if (d) { photo = await loadImg(d); break; } }
  ctx.save();
  ctx.translate(1530, 640);
  ctx.rotate(0.06);
  ctx.fillStyle = ink; roundRect(ctx, -270 + 14, -300 + 18, 540, 620, 18); ctx.fill();
  ctx.fillStyle = '#ffffff'; roundRect(ctx, -270, -300, 540, 620, 18); ctx.fill();
  ctx.lineWidth = 7; ctx.strokeStyle = ink; ctx.stroke();
  ctx.save(); roundRect(ctx, -235, -265, 470, 470, 10); ctx.clip();
  if (photo) {
    const k = Math.max(470 / photo.width, 470 / photo.height);
    ctx.drawImage(photo, -photo.width * k / 2, -30 - photo.height * k / 2, photo.width * k, photo.height * k);
  } else {
    ctx.fillStyle = c.bg; ctx.fillRect(-235, -265, 470, 470);
    ctx.font = '260px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(th.emoji, 0, -30);
  }
  ctx.restore();
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  fitText(ctx, team, 460, 46, 700);
  ctx.fillText(team, 0, 280);
  ctx.restore();

  // sceau
  ctx.save();
  ctx.translate(1700, 1080);
  ctx.fillStyle = '#ffc43d';
  ctx.beginPath();
  for (let i = 0; i < 24; i++) { const r = i % 2 ? 110 : 130, a = i * Math.PI / 12; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = ink; ctx.stroke();
  ctx.font = '110px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(th.mascot, 0, 6);
  ctx.restore();

  return cv;
}

function wrap(ctx, text, maxW) {
  const words = text.split(' '), lines = [];
  let line = '';
  words.forEach(w => {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  });
  if (line) lines.push(line);
  return lines;
}

export async function showDiploma(g) {
  const wrapEl = document.createElement('div');
  wrapEl.className = 'diploma-view';
  wrapEl.innerHTML = `<div class="diploma-inner"><p class="loading">Le diplôme se prépare…</p></div>`;
  document.body.appendChild(wrapEl);
  const cv = await drawDiploma(g);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const url = URL.createObjectURL(blob);
  const name = `diplome-${slug(g.teamName || 'equipe')}.png`;
  const file = new File([blob], name, { type: 'image/png' });
  const canShare = navigator.canShare?.({ files: [file] });
  wrapEl.querySelector('.diploma-inner').innerHTML = `
    <img src="${url}" alt="Diplôme de l'équipe ${esc(g.teamName)}" class="diploma-img">
    <div class="diploma-actions">
      ${canShare ? '<button class="btn primary" data-a="share">📤 Partager</button>' : ''}
      <button class="btn ${canShare ? '' : 'primary'}" data-a="dl">⬇️ Télécharger</button>
      <button class="btn" data-a="print">🖨️ Imprimer</button>
      <button class="btn" data-a="close">Fermer</button>
    </div>`;
  const printBox = document.createElement('div');
  printBox.className = 'print-only diploma-print';
  printBox.innerHTML = `<img src="${url}" alt="">`;
  document.body.appendChild(printBox);
  wrapEl.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'share') { try { await navigator.share({ files: [file], title: 'Notre diplôme de chasse au trésor' }); } catch { /* annulé */ } }
    if (a === 'dl') { download(name, blob); toast('Diplôme téléchargé'); }
    if (a === 'print') { document.body.classList.add('printing-diploma'); window.print(); setTimeout(() => document.body.classList.remove('printing-diploma'), 500); }
    if (a === 'close' || e.target === wrapEl) { wrapEl.remove(); printBox.remove(); URL.revokeObjectURL(url); }
  });
}
