// Géolocalisation et boussole.

export const hasGeo = () => 'geolocation' in navigator;

// Suivi continu de la position. Renvoie une fonction d'arrêt.
export function watch(onPos, onErr) {
  if (!hasGeo()) { onErr?.(new Error('nogeo')); return () => {}; }
  const id = navigator.geolocation.watchPosition(
    p => onPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, t: p.timestamp }),
    e => onErr?.(e),
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

// Position précise : moyenne pondérée de plusieurs mesures (pour enregistrer une balise)
export function averagedPosition({ samples = 6, maxWait = 15000, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const pts = [];
    let best = null;
    const stop = watch(p => {
      if (p.acc > 80) { onProgress?.(pts.length, samples, p.acc); return; } // trop imprécis
      pts.push(p);
      if (!best || p.acc < best.acc) best = p;
      onProgress?.(pts.length, samples, p.acc);
      if (pts.length >= samples) end();
    }, err => { clearTimeout(timer); stop(); reject(err); });
    const end = () => {
      clearTimeout(timer);
      stop();
      if (!pts.length) return reject(new Error('imprecise'));
      let sw = 0, lat = 0, lng = 0;
      pts.forEach(p => { const w = 1 / Math.max(1, p.acc) ** 2; sw += w; lat += p.lat * w; lng += p.lng * w; });
      resolve({ lat: lat / sw, lng: lng / sw, acc: Math.round(Math.min(...pts.map(p => p.acc))) });
    };
    const timer = setTimeout(end, maxWait);
  });
}

export function geoErrorText(e) {
  if (!e) return '';
  if (e.message === 'nogeo') return 'Ce téléphone ne donne pas sa position.';
  if (e.code === 1) return 'La localisation est refusée. Autorise-la dans les réglages du navigateur.';
  if (e.code === 3) return 'Le GPS met du temps à répondre. Va à découvert, loin des murs.';
  if (e.message === 'imprecise') return 'Position trop imprécise. Réessaie à découvert.';
  return 'Position introuvable pour le moment.';
}

// --- Boussole ---
// Sur iPhone, il faut une autorisation demandée lors d'un toucher.
export async function requestCompass() {
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === 'function') {
    try { return (await D.requestPermission()) === 'granted'; } catch { return false; }
  }
  return !!D;
}
export function watchHeading(onHeading) {
  const handler = e => {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading; // iOS
    else if (e.absolute && typeof e.alpha === 'number') h = (360 - e.alpha) % 360; // Android
    if (h != null) onHeading((h + screenAngle()) % 360);
  };
  const ev = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
  window.addEventListener(ev, handler, true);
  return () => window.removeEventListener(ev, handler, true);
}
function screenAngle() {
  return (screen.orientation?.angle ?? window.orientation ?? 0) || 0;
}
