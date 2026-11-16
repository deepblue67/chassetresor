// Guidage GPS : radar chaud/froid, boussole ou carte.
import { distance, bearing, fmtDist } from './util.js';
import { watch, geoErrorText, requestCompass, watchHeading } from './geo.js';
import { sfx } from './audio.js';
import { loadLeaflet, tileLayer, meIcon } from './ui.js';

const LEVELS = [
  { word: 'Glacial', emoji: '🥶', color: '#5aa9ff' },
  { word: 'Froid', emoji: '❄️', color: '#8fd3ff' },
  { word: 'Tiède', emoji: '🙂', color: '#ffd166' },
  { word: 'Chaud', emoji: '🔥', color: '#ff9f43' },
  { word: 'Brûlant !', emoji: '🌋', color: '#ff4d4d' },
  { word: 'Tu y es !', emoji: '🎯', color: '#3dbe7a' },
];
const BEEP_EVERY = [2600, 1900, 1300, 750, 380, 0];

export function levelFor(d, r) {
  if (d <= r) return 5;
  if (d < r + 15) return 4;
  if (d < r + 40) return 3;
  if (d < r + 90) return 2;
  if (d < r + 200) return 1;
  return 0;
}

/**
 * opts : target {lat,lng}, radius, nav ('radar'|'boussole'|'carte'), zone, test,
 *        onArrive(), onZoneExit(), keepGoingAfterArrive (mode GPS + QR)
 */
export function mountRadar(el, opts) {
  const { target, radius = 20, nav = 'radar' } = opts;
  el.innerHTML = `
    <div class="radar lv-0" style="--lv:${LEVELS[0].color}">
      <div class="radar-dial">
        <div class="radar-rings"><i></i><i></i><i></i></div>
        <div class="radar-sweep"></div>
        <div class="radar-arrow" hidden><svg viewBox="0 0 100 100"><path d="M50 6 L78 70 L50 56 L22 70 Z" fill="var(--accent2)" stroke="var(--line)" stroke-width="5" stroke-linejoin="round"/></svg></div>
        <div class="radar-core"><span class="radar-emoji">📡</span></div>
      </div>
      <div class="radar-word">Recherche du signal…</div>
      <div class="radar-trend" aria-live="polite">&nbsp;</div>
      ${nav !== 'radar' ? '<div class="radar-dist">…</div>' : ''}
      ${nav === 'boussole' ? '<button class="btn small" id="compassBtn" hidden>🧭 Activer la boussole</button>' : ''}
      ${nav === 'carte' ? '<div class="radar-map"></div>' : ''}
      <div class="radar-acc"></div>
    </div>`;
  const root = el.querySelector('.radar');
  const $w = el.querySelector('.radar-word'), $t = el.querySelector('.radar-trend'),
    $e = el.querySelector('.radar-emoji'), $d = el.querySelector('.radar-dist'),
    $a = el.querySelector('.radar-acc'), $arrow = el.querySelector('.radar-arrow');

  let level = -1, lastPos = null, hist = [], arrivedCount = 0, arrived = false, beepT = null, stopped = false;
  let heading = null, lastZoneAlert = 0, map = null, meMarker = null;

  const setLevel = lv => {
    if (lv === level) return;
    level = lv;
    root.className = `radar lv-${lv}`;
    root.style.setProperty('--lv', LEVELS[lv].color);
    $e.textContent = LEVELS[lv].emoji;
    $w.textContent = LEVELS[lv].word;
  };

  const beepLoop = () => {
    if (stopped) return;
    if (level >= 0 && level < 5) sfx.radar(level);
    beepT = setTimeout(beepLoop, level >= 0 ? BEEP_EVERY[level] || 1500 : 1500);
  };

  const updateArrow = () => {
    if (!$arrow || nav !== 'boussole' || !lastPos) return;
    if (heading == null) { $arrow.hidden = true; return; }
    $arrow.hidden = false;
    const rot = bearing(lastPos, target) - heading;
    $arrow.style.transform = `rotate(${rot}deg)`;
  };

  const onPos = p => {
    if (stopped) return;
    lastPos = p;
    const d = distance(p, target);
    const now = Date.now();
    hist.push({ t: now, d });
    hist = hist.filter(h => now - h.t < 12000);
    const old = hist.find(h => now - h.t >= 4000);
    const lv = levelFor(d, radius);
    setLevel(lv);
    if ($d) $d.textContent = fmtDist(d);
    $a.textContent = p.acc > 30 ? `⚠️ GPS imprécis (± ${Math.round(p.acc)} m), va à découvert` : `GPS ± ${Math.round(p.acc)} m`;
    if (lv < 5 && old) {
      const diff = old.d - d;
      $t.textContent = diff > 3 ? 'Tu te rapproches !' : diff < -3 ? 'Tu t\'éloignes…' : 'Continue à chercher';
      $t.className = 'radar-trend ' + (diff > 3 ? 'hot' : diff < -3 ? 'cold' : '');
    }
    updateArrow();
    if (map) {
      if (!meMarker) meMarker = window.L.marker([p.lat, p.lng], { icon: meIcon(window.L) }).addTo(map);
      else meMarker.setLatLng([p.lat, p.lng]);
    }
    // arrivée : deux mesures d'affilée dans la zone (évite les sauts du GPS)
    const inZone = d <= radius + Math.min(p.acc, 20) * 0.4;
    arrivedCount = inZone ? arrivedCount + 1 : 0;
    if (arrivedCount >= 2 && !arrived) {
      arrived = true;
      setLevel(5);
      $t.textContent = opts.keepGoingAfterArrive ? 'Cherchez le QR code caché tout près !' : '';
      opts.onArrive?.();
    }
    if (opts.zone && distance(p, opts.zone) > opts.zone.r + 10 && now - lastZoneAlert > 20000) {
      lastZoneAlert = now;
      opts.onZoneExit?.();
    }
  };

  const stopGeo = opts.test ? () => {} : watch(onPos, e => {
    // une erreur passagère alors qu'on a une position récente : on l'ignore
    if (lastPos && e.code !== 1 && Date.now() - lastPos.t < 30000) return;
    level = -1;
    $w.textContent = 'Pas de signal GPS';
    $t.textContent = geoErrorText(e);
  });
  if (opts.test) { $w.textContent = 'Mode test'; $t.textContent = 'Utilise « Simuler l\'arrivée ».'; }
  beepLoop();

  // Boussole
  let stopHeading = () => {};
  if (nav === 'boussole') {
    const btn = el.querySelector('#compassBtn');
    const startHeading = () => { stopHeading = watchHeading(h => { heading = h; updateArrow(); }); };
    if (typeof window.DeviceOrientationEvent?.requestPermission === 'function') {
      btn.hidden = false;
      btn.onclick = async () => { if (await requestCompass()) { btn.hidden = true; startHeading(); } };
    } else startHeading();
  }

  // Carte
  if (nav === 'carte') {
    loadLeaflet().then(L => {
      if (stopped) return;
      map = L.map(el.querySelector('.radar-map'), { zoomControl: false, attributionControl: true }).setView([target.lat, target.lng], 17);
      tileLayer(L).addTo(map);
      L.circle([target.lat, target.lng], { radius, color: '#ff4d4d', weight: 3, fillOpacity: 0.15 }).addTo(map);
      if (opts.zone) L.circle([opts.zone.lat, opts.zone.lng], { radius: opts.zone.r, color: '#1d2b53', weight: 2, dashArray: '6 6', fill: false }).addTo(map);
    });
  }

  return {
    simulateArrive() { if (!arrived) { arrived = true; setLevel(5); opts.onArrive?.(); } },
    stop() {
      stopped = true;
      clearTimeout(beepT);
      stopGeo();
      stopHeading();
      map?.remove();
    },
  };
}
