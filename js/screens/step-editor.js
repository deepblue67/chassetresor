// Éditeur d'une étape : indice, validation (QR / GPS), défi et indices.
import { topbar, chips, bindChips, empty, loadLeaflet, tileLayer, numberIcon } from '../ui.js';
import { getHunt, saveHunt } from '../store.js';
import { esc, toast, confirmDialog, pickImage, resizeImage, dialog } from '../util.js';
import { VALIDATIONS, CHALLENGES, newChallenge, rewardMap } from '../hunt.js';
import { pickRiddle } from '../library.js';
import { averagedPosition, geoErrorText } from '../geo.js';
import { speak, canSpeak } from '../audio.js';
import { go } from '../app.js';

export default async function stepEditor(app, { id, sid }) {
  const h = await getHunt(id);
  const idx = h ? h.steps.findIndex(s => s.id === sid) : -1;
  if (idx < 0) {
    app.innerHTML = topbar({ title: 'Étape introuvable', back: `#/edit/${id}` }) + `<div class="page">${empty('🧐', 'Étape introuvable', '', `<a class="btn primary" href="#/edit/${id}">Retour</a>`)}</div>`;
    return;
  }
  const s = h.steps[idx];
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => saveHunt(h), 300); };
  const prev = h.steps[idx - 1], next = h.steps[idx + 1];
  const rr = rewardMap(h)[s.id] || [];
  let map = null, marker = null, circle = null;

  app.innerHTML = `
    ${topbar({ title: `Étape ${idx + 1} sur ${h.steps.length}`, back: `#/edit/${h.id}` })}
    <div class="page editor">
      <section class="card">
        <label class="field big"><span>Titre (facultatif)</span><input id="title" value="${esc(s.title)}" maxlength="50" placeholder="La cabine du capitaine"></label>
        <label class="field"><span>L'indice qui dit où aller</span>
          <textarea id="clue" rows="3" placeholder="Là où dorment les bottes de papa…">${esc(s.clue)}</textarea>
        </label>
        <div class="row wrap">
          ${canSpeak() ? '<button class="btn small" id="hear">🔊 Écouter</button>' : ''}
          <button class="btn small" id="photo">📷 ${s.cluePhoto ? 'Changer la photo' : 'Ajouter une photo indice'}</button>
          ${s.cluePhoto ? '<button class="btn small" id="rmPhoto">Retirer la photo</button>' : ''}
        </div>
        ${s.cluePhoto ? `<img class="clue-photo small" src="${s.cluePhoto}" alt="Photo indice">` : ''}
        <label class="field"><span>Coup de pouce si ça bloque (facultatif)</span><input id="clueHint" value="${esc(s.clueHint)}" placeholder="C'est dans l'entrée…"></label>
      </section>

      <section class="card">
        <h2 class="card-title">Comment valider l'arrivée ?</h2>
        ${chips('validate', VALIDATIONS, s.validate)}
        <div id="valBox"></div>
      </section>

      <section class="card">
        <div class="card-head"><h2 class="card-title">Le défi sur place</h2><button class="btn small" id="lib">📚 Bibliothèque</button></div>
        ${chips('ctype', CHALLENGES, s.challenge.type, { small: true })}
        <div id="chalBox"></div>
      </section>

      <section class="card reward-info">
        <p>🎁 Récompense de cette étape : <b>${rr.length ? rr.map(r => `${h.lock.type === 'code' ? `chiffre n°${r.pos + 1}` : 'la lettre'} « ${esc(r.ch)} »`).join(', ') : 'une étoile'}</b></p>
        <p class="help">La répartition se fait toute seule selon le code du trésor.</p>
      </section>

      <div class="row spread">
        ${prev ? `<a class="btn small" href="#/edit/${h.id}/s/${prev.id}">‹ Étape ${idx}</a>` : '<span></span>'}
        <button class="btn small danger" id="del">Supprimer</button>
        ${next ? `<a class="btn small" href="#/edit/${h.id}/s/${next.id}">Étape ${idx + 2} ›</a>` : `<button class="btn small primary" id="addNext">＋ Étape suivante</button>`}
      </div>
    </div>`;

  const $ = q => app.querySelector(q);
  $('#title').oninput = e => { s.title = e.target.value; save(); };
  $('#clue').oninput = e => { s.clue = e.target.value; save(); };
  $('#clueHint').oninput = e => { s.clueHint = e.target.value; save(); };
  $('#hear')?.addEventListener('click', () => speak(s.clue || 'Écris un indice d\'abord.', { force: true }));
  $('#photo').onclick = async () => {
    const f = await pickImage({ capture: false });
    if (!f) return;
    s.cluePhoto = await resizeImage(f, 560, 0.62);
    await saveHunt(h);
    go(`edit/${id}/s/${sid}`);
  };
  $('#rmPhoto')?.addEventListener('click', async () => { s.cluePhoto = null; await saveHunt(h); go(`edit/${id}/s/${sid}`); });

  // --- Validation ---
  bindChips(app, 'validate', v => { s.validate = v; save(); drawVal(); });
  function drawVal() {
    map?.remove(); map = null;
    const v = s.validate;
    const box = $('#valBox');
    let html = '';
    if (v === 'qr' || v === 'gpsqr') {
      html += `
        <label class="field"><span>Où vas-tu cacher le QR code ? (note pour toi)</span><input id="hide" value="${esc(s.hide)}" placeholder="Sous le pot de fleurs de l'entrée"></label>
        <p class="help">Code de secours imprimé sous le QR : <b class="mono-code">${s.code}</b></p>`;
    }
    if (v === 'gps' || v === 'gpsqr') {
      html += `
        <div class="mini-map" id="miniMap"></div>
        <p class="help" id="posTxt">${s.lat != null ? `Point placé. Rayon de déblocage : ${s.radius} m.` : 'Touche la carte pour placer le point, ou enregistre ta position sur place.'}</p>
        <div class="row wrap">
          <button class="btn small primary" id="here">📍 Enregistrer ma position ici</button>
          <a class="btn small" href="#/edit/${h.id}/carte">🗺️ Toutes les étapes</a>
        </div>
        <label class="field"><span>Rayon de déblocage : <b id="rv">${s.radius}</b> m</span><input type="range" id="radius" min="8" max="60" step="1" value="${s.radius}"></label>
        <p class="help">Dehors, le GPS est précis à 5-15 m près. Sous les arbres, prévois 20 m ou plus.</p>`;
    }
    if (v === 'aucune') html = '<p class="help">Les joueurs appuient sur « On a trouvé ! ». Pratique pour une étape surveillée par un adulte.</p>';
    box.innerHTML = html;
    $('#hide')?.addEventListener('input', e => { s.hide = e.target.value; save(); });
    if (v === 'gps' || v === 'gpsqr') setupMap();
  }

  async function setupMap() {
    const L = await loadLeaflet();
    const el = $('#miniMap');
    if (!el) return;
    const others = h.steps.filter(x => x.id !== s.id && x.lat != null);
    const center = s.lat != null ? [s.lat, s.lng] : others[0] ? [others[0].lat, others[0].lng] : h.zone ? [h.zone.lat, h.zone.lng] : [46.6, 2.4];
    map = L.map(el, { zoomControl: true }).setView(center, s.lat != null || others.length || h.zone ? 18 : 5);
    tileLayer(L).addTo(map);
    others.forEach(o => L.marker([o.lat, o.lng], { icon: numberIcon(L, h.steps.indexOf(o) + 1), interactive: false, opacity: 0.6 }).addTo(map));
    const place = (lat, lng) => {
      s.lat = +lat.toFixed(7); s.lng = +lng.toFixed(7);
      if (!marker) {
        marker = L.marker([s.lat, s.lng], { icon: numberIcon(L, idx + 1, { active: true }), draggable: true }).addTo(map);
        marker.on('dragend', () => { const p = marker.getLatLng(); place(p.lat, p.lng); });
        circle = L.circle([s.lat, s.lng], { radius: s.radius, color: '#ff6f59', weight: 3, fillOpacity: 0.15 }).addTo(map);
      } else { marker.setLatLng([s.lat, s.lng]); circle.setLatLng([s.lat, s.lng]); }
      $('#posTxt').textContent = `Point placé. Rayon de déblocage : ${s.radius} m.`;
      save();
    };
    marker = null;
    if (s.lat != null) place(s.lat, s.lng);
    map.on('click', e => place(e.latlng.lat, e.latlng.lng));
    if (s.lat == null && !others.length && !h.zone) {
      // se centrer sur l'organisateur si possible
      navigator.geolocation?.getCurrentPosition(p => map?.setView([p.coords.latitude, p.coords.longitude], 18), () => {}, { timeout: 8000 });
    }
    $('#radius').oninput = e => { s.radius = +e.target.value; $('#rv').textContent = s.radius; circle?.setRadius(s.radius); save(); };
    $('#here').onclick = async () => {
      const b = $('#here');
      b.disabled = true;
      try {
        const p = await averagedPosition({ onProgress: (n, tot, acc) => { b.textContent = `📡 Mesure ${n}/${tot} (± ${Math.round(acc)} m)…`; } });
        place(p.lat, p.lng);
        map.setView([p.lat, p.lng], 19);
        toast(`Position enregistrée (± ${p.acc} m)`);
      } catch (e) { toast(geoErrorText(e), 'bad'); }
      b.disabled = false;
      b.textContent = '📍 Enregistrer ma position ici';
    };
  }

  // --- Défi ---
  bindChips(app, 'ctype', v => {
    const old = s.challenge;
    s.challenge = { ...newChallenge(v), q: old.q, hints: old.hints, emoji: old.emoji };
    save(); drawChal();
  });
  $('#lib').onclick = async () => {
    const r = await pickRiddle(h.age);
    if (!r) return;
    s.challenge = { ...newChallenge(r.type), ...r };
    await saveHunt(h);
    go(`edit/${id}/s/${sid}`);
  };

  function drawChal() {
    const c = s.challenge;
    const box = $('#chalBox');
    if (c.type === 'aucun') { box.innerHTML = '<p class="help">Trouver l\'endroit suffit pour gagner la récompense.</p>'; return; }
    const qLabel = { texte: 'La devinette', qcm: 'La question', nombre: 'Le calcul ou la question', photo: 'Ce qu\'il faut photographier', adulte: 'Le défi à réaliser' }[c.type];
    let html = `
      <div class="row emoji-row">
        <label class="field emoji-field"><span>Émoji</span><input id="cemoji" value="${esc(c.emoji)}" maxlength="4" placeholder="🦜"></label>
        <label class="field grow"><span>${qLabel}</span><textarea id="cq" rows="3">${esc(c.q)}</textarea></label>
      </div>`;
    if (c.type === 'texte' || c.type === 'nombre') {
      html += `<label class="field"><span>Bonne(s) réponse(s), séparées par des virgules</span><input id="cans" value="${esc((c.answers || []).join(', '))}" placeholder="${c.type === 'nombre' ? '24' : 'peigne, un peigne'}"></label>
        <p class="help">Les majuscules, les accents et « le, la, un » ne comptent pas. Une petite faute de frappe est acceptée.</p>`;
    }
    if (c.type === 'qcm') {
      html += `<div class="field"><span>Choix (coche la bonne réponse)</span>${[0, 1, 2, 3].map(i => `
        <label class="choice-edit"><input type="radio" name="corr" value="${i}" ${+c.correct === i ? 'checked' : ''}><input data-ch="${i}" value="${esc(c.choices[i] || '')}" placeholder="Choix ${i + 1}${i === 3 ? ' (facultatif)' : ''}"></label>`).join('')}</div>`;
    }
    if (c.type === 'adulte') html += '<p class="help">Un adulte valide en maintenant le bouton 2 secondes.</p>';
    if (c.type === 'photo') html += '<p class="help">La photo est gardée sur le téléphone et apparaît sur le diplôme.</p>';
    if (c.type !== 'photo' && c.type !== 'adulte') {
      html += `<div class="field"><span>Trois indices progressifs</span>
        ${[0, 1, 2].map(i => `<input class="hint-in" data-hint="${i}" value="${esc(c.hints[i] || '')}" placeholder="Indice ${i + 1}${i === 2 ? ' (presque la réponse)' : ''}">`).join('')}
        <p class="help">Ils se débloquent après ${h.hintDelays.join(', ')} secondes.</p></div>`;
    }
    box.innerHTML = html;
    $('#cq').oninput = e => { c.q = e.target.value; save(); };
    $('#cemoji').oninput = e => { c.emoji = e.target.value; save(); };
    $('#cans')?.addEventListener('input', e => { c.answers = e.target.value.split(',').map(x => x.trim()).filter(Boolean); save(); });
    box.querySelectorAll('[data-ch]').forEach(inp => inp.oninput = () => { c.choices[+inp.dataset.ch] = inp.value; save(); });
    box.querySelectorAll('[name=corr]').forEach(r => r.onchange = () => { c.correct = +r.value; save(); });
    box.querySelectorAll('[data-hint]').forEach(inp => inp.oninput = () => { c.hints[+inp.dataset.hint] = inp.value; save(); });
  }

  $('#del').onclick = async () => {
    if (!await confirmDialog('Supprimer cette étape ?', 'Son QR code ne servira plus.', 'Supprimer', true)) return;
    h.steps.splice(idx, 1);
    await saveHunt(h);
    go('edit/' + h.id);
  };
  $('#addNext')?.addEventListener('click', async () => {
    const { newStep } = await import('../hunt.js');
    const ns = newStep(h, { validate: s.validate });
    h.steps.push(ns);
    await saveHunt(h);
    go(`edit/${h.id}/s/${ns.id}`);
  });

  drawVal(); drawChal();
  return () => { clearTimeout(saveT); saveHunt(h); map?.remove(); };
}
