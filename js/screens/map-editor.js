// Carte du parcours : placer toutes les balises GPS et la zone de jeu.
import { topbar, loadLeaflet, tileLayer, numberIcon, meIcon } from '../ui.js';
import { getHunt, saveHunt } from '../store.js';
import { esc, toast, fmtDist, distance } from '../util.js';
import { watch, averagedPosition, geoErrorText } from '../geo.js';

export default async function mapEditor(app, { id }) {
  const h = await getHunt(id);
  if (!h) { location.hash = '#/org'; return; }
  const gpsSteps = () => h.steps.filter(s => s.validate === 'gps' || s.validate === 'gpsqr');
  let sel = gpsSteps().find(s => s.lat == null)?.id || gpsSteps()[0]?.id || 'zone';
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => saveHunt(h), 250); };

  app.innerHTML = `
    ${topbar({ title: 'Carte du parcours', back: `#/edit/${h.id}` })}
    <div class="map-screen">
      <div id="bigMap" class="big-map"></div>
      <button class="icon-btn map-locate" id="locate" aria-label="Me localiser">🎯</button>
      <div class="map-panel">
        <div class="chips small" id="selChips"></div>
        <p class="help" id="mapHelp"></p>
        <div id="panelBody"></div>
      </div>
    </div>`;
  const $ = q => app.querySelector(q);
  const L = await loadLeaflet();
  const pts = h.steps.filter(s => s.lat != null);
  const map = L.map($('#bigMap'), { zoomControl: false });
  tileLayer(L).addTo(map);
  if (pts.length) map.fitBounds(L.latLngBounds(pts.map(s => [s.lat, s.lng])).pad(0.3), { maxZoom: 18 });
  else if (h.zone) map.setView([h.zone.lat, h.zone.lng], 17);
  else map.setView([46.6, 2.4], 5);

  const markers = {};
  let zoneCircle = null, line = null, me = null, firstFix = !pts.length && !h.zone;

  const stopWatch = watch(p => {
    if (!me) me = L.marker([p.lat, p.lng], { icon: meIcon(L), interactive: false }).addTo(map);
    else me.setLatLng([p.lat, p.lng]);
    if (firstFix) { map.setView([p.lat, p.lng], 18); firstFix = false; }
  }, () => {});

  function drawMarkers() {
    Object.values(markers).forEach(m => m.remove());
    line?.remove();
    gpsSteps().forEach(s => {
      if (s.lat == null) return;
      const n = h.steps.indexOf(s) + 1;
      const m = L.marker([s.lat, s.lng], { icon: numberIcon(L, n, { active: s.id === sel }), draggable: true }).addTo(map);
      m.on('dragend', () => { const p = m.getLatLng(); s.lat = +p.lat.toFixed(7); s.lng = +p.lng.toFixed(7); save(); drawMarkers(); });
      m.on('click', () => { sel = s.id; drawAll(); });
      markers[s.id + 'c'] = L.circle([s.lat, s.lng], { radius: s.radius, color: '#ff6f59', weight: 2, fillOpacity: 0.1, interactive: false }).addTo(map);
      markers[s.id] = m;
    });
    const path = gpsSteps().filter(s => s.lat != null).map(s => [s.lat, s.lng]);
    if (path.length > 1) line = L.polyline(path, { color: '#1d2b53', weight: 3, dashArray: '8 8', interactive: false }).addTo(map);
    zoneCircle?.remove();
    if (h.zone) zoneCircle = L.circle([h.zone.lat, h.zone.lng], { radius: h.zone.r, color: '#1d2b53', weight: 3, dashArray: '10 8', fillOpacity: sel === 'zone' ? 0.08 : 0, interactive: false }).addTo(map);
  }

  function drawPanel() {
    const steps = gpsSteps();
    $('#selChips').innerHTML = steps.map(s => `<button class="chip ${s.id === sel ? 'on' : ''}" data-s="${s.id}">${s.lat == null ? '📍' : '✓'} Étape ${h.steps.indexOf(s) + 1}</button>`).join('')
      + `<button class="chip ${sel === 'zone' ? 'on' : ''}" data-s="zone">⭕ Zone de jeu</button>`;
    const body = $('#panelBody');
    if (sel === 'zone') {
      $('#mapHelp').textContent = h.zone ? 'Touche la carte pour déplacer le centre de la zone.' : 'Touche la carte pour placer le centre de la zone de jeu.';
      body.innerHTML = h.zone ? `
        <label class="field"><span>Rayon : <b id="zr">${Math.round(h.zone.r)}</b> m</span><input type="range" id="zrange" min="30" max="1000" step="10" value="${h.zone.r}"></label>
        <button class="btn small danger" id="zdel">Supprimer la zone</button>` : '';
      $('#zrange')?.addEventListener('input', e => { h.zone.r = +e.target.value; $('#zr').textContent = h.zone.r; zoneCircle?.setRadius(h.zone.r); save(); });
      $('#zdel')?.addEventListener('click', () => { h.zone = null; save(); drawAll(); });
    } else {
      const s = h.steps.find(x => x.id === sel);
      if (!s) { body.innerHTML = '<p class="help">Aucune étape GPS. Change le mode de validation d\'une étape.</p>'; $('#mapHelp').textContent = ''; return; }
      const n = h.steps.indexOf(s) + 1;
      $('#mapHelp').textContent = `Touche la carte pour placer l'étape ${n}, ou fais glisser son repère.`;
      const prevS = h.steps[n - 2];
      body.innerHTML = `
        <p class="map-step-clue"><b>${esc(s.title || 'Étape ' + n)}</b> ${esc(s.clue || '')}</p>
        ${prevS && prevS.lat != null && s.lat != null ? `<p class="help">À ${fmtDist(distance(prevS, s))} de l'étape ${n - 1}.</p>` : ''}
        <button class="btn small primary" id="here">📍 Ma position pour l'étape ${n}</button>`;
      $('#here').onclick = async () => {
        const b = $('#here');
        b.disabled = true;
        try {
          const p = await averagedPosition({ onProgress: (k, tot, acc) => { b.textContent = `📡 Mesure ${k}/${tot} (± ${Math.round(acc)} m)…`; } });
          s.lat = +p.lat.toFixed(7); s.lng = +p.lng.toFixed(7);
          save(); map.setView([s.lat, s.lng], 19);
          toast(`Étape ${n} enregistrée (± ${p.acc} m)`);
          const nextMissing = gpsSteps().find(x => x.lat == null);
          if (nextMissing) sel = nextMissing.id;
          drawAll();
        } catch (e) { toast(geoErrorText(e), 'bad'); b.disabled = false; }
      };
    }
    $('#selChips').querySelectorAll('[data-s]').forEach(c => c.onclick = () => {
      sel = c.dataset.s;
      const s = h.steps.find(x => x.id === sel);
      if (s?.lat != null) map.panTo([s.lat, s.lng]);
      drawAll();
    });
  }
  function drawAll() { drawMarkers(); drawPanel(); }

  map.on('click', e => {
    const { lat, lng } = e.latlng;
    if (sel === 'zone') {
      h.zone = { lat: +lat.toFixed(7), lng: +lng.toFixed(7), r: h.zone?.r || 150 };
    } else {
      const s = h.steps.find(x => x.id === sel);
      if (!s) return;
      const wasEmpty = s.lat == null;
      s.lat = +lat.toFixed(7); s.lng = +lng.toFixed(7);
      // on passe tout seul à l'étape suivante à placer
      if (wasEmpty) {
        const nextMissing = gpsSteps().find(x => x.lat == null);
        if (nextMissing) { sel = nextMissing.id; toast(`Étape ${h.steps.indexOf(s) + 1} placée. Au tour de l'étape ${h.steps.indexOf(nextMissing) + 1}.`); }
      }
    }
    save(); drawAll();
  });
  $('#locate').onclick = () => { if (me) map.setView(me.getLatLng(), 18); else toast('Position en cours de recherche…'); };

  drawAll();
  setTimeout(() => map.invalidateSize(), 100);
  return () => { clearTimeout(saveT); saveHunt(h); stopWatch(); map.remove(); };
}
