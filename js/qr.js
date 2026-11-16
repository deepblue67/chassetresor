// QR codes : génération (SVG) et lecture par la caméra.
import { esc, toast } from './util.js';
import { sfx } from './audio.js';

// --- Génération ---
export function qrSvg(text, { ecc = 'M', margin = 2, color = '#000' } = {}) {
  let qr;
  try {
    qr = window.qrcode(0, ecc);
    qr.addData(text);
    qr.make();
  } catch {
    return null; // trop de données pour un QR code
  }
  const n = qr.getModuleCount(), size = n + margin * 2;
  let d = '';
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.isDark(r, c)) d += `M${c + margin} ${r + margin}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" class="qr"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="${color}"/></svg>`;
}

// --- Lecture ---
let jsqrLoading;
function loadJsQR() {
  if (window.jsQR) return Promise.resolve();
  if (!jsqrLoading) {
    jsqrLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/jsQR.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return jsqrLoading;
}

class Scanner {
  constructor(video, onResult) {
    this.video = video;
    this.onResult = onResult;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.running = false;
  }
  async start() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('nocamera');
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    this.video.srcObject = this.stream;
    this.video.setAttribute('playsinline', '');
    this.video.muted = true;
    await this.video.play();
    if ('BarcodeDetector' in window) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        if (formats.includes('qr_code')) this.detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch { /* repli jsQR */ }
    }
    if (!this.detector) await loadJsQR();
    this.running = true;
    this.loop();
  }
  async loop() {
    if (!this.running) return;
    const v = this.video;
    if (v.readyState >= 2 && v.videoWidth) {
      try {
        let text = null;
        if (this.detector) {
          const codes = await this.detector.detect(v);
          text = codes[0]?.rawValue || null;
        } else {
          // On analyse le centre de l'image, réduit, pour aller vite
          const side = Math.min(v.videoWidth, v.videoHeight);
          const sx = (v.videoWidth - side) / 2, sy = (v.videoHeight - side) / 2;
          const N = 480;
          this.canvas.width = this.canvas.height = N;
          this.ctx.drawImage(v, sx, sy, side, side, 0, 0, N, N);
          const img = this.ctx.getImageData(0, 0, N, N);
          const res = window.jsQR(img.data, N, N, { inversionAttempts: 'dontInvert' });
          text = res?.data || null;
        }
        if (text && this.running) {
          this.onResult(text);
        }
      } catch { /* image suivante */ }
    }
    setTimeout(() => this.loop(), this.detector ? 120 : 160);
  }
  get torchSupported() {
    const track = this.stream?.getVideoTracks()[0];
    return !!track?.getCapabilities?.().torch;
  }
  async torch(on) {
    const track = this.stream?.getVideoTracks()[0];
    try { await track.applyConstraints({ advanced: [{ torch: on }] }); } catch { /* non supporté */ }
  }
  stop() {
    this.running = false;
    this.stream?.getTracks().forEach(t => t.stop());
    this.video.srcObject = null;
  }
}

/**
 * Ouvre le lecteur plein écran.
 * accept(text) renvoie true si le code est bon (le lecteur se ferme), un message d'erreur sinon.
 * manual : autorise la saisie du code imprimé sous le QR.
 */
export function openScanner({ title = 'Scanne le QR code', accept, manual = true, manualLabel = 'Taper le code écrit sous le QR' }) {
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.className = 'scanner';
    el.innerHTML = `
      <video playsinline muted></video>
      <div class="scan-ui">
        <div class="scan-top">
          <button class="icon-btn" data-a="close" aria-label="Fermer">✕</button>
          <h2>${esc(title)}</h2>
          <button class="icon-btn" data-a="torch" aria-label="Lampe" hidden>🔦</button>
        </div>
        <div class="scan-frame"><i></i><i></i><i></i><i></i><div class="scan-laser"></div></div>
        <p class="scan-msg" aria-live="polite">Place le QR code dans le cadre</p>
        ${manual ? `<button class="btn ghost light" data-a="manual">⌨️ ${esc(manualLabel)}</button>` : ''}
      </div>`;
    document.body.appendChild(el);
    const msg = el.querySelector('.scan-msg');
    let lastBad = '', lastBadAt = 0, done = false;

    const finish = val => {
      if (done) return;
      done = true;
      scanner.stop();
      el.classList.add('out');
      setTimeout(() => el.remove(), 200);
      resolve(val);
    };
    const tryText = text => {
      const r = accept(text);
      if (r === true) {
        sfx.scan();
        el.classList.add('hit');
        setTimeout(() => finish(text), 350);
        return true;
      }
      const now = Date.now();
      if (text !== lastBad || now - lastBadAt > 2500) {
        lastBad = text; lastBadAt = now;
        sfx.wrong();
        msg.textContent = r || 'Ce QR code ne correspond pas.';
        msg.classList.add('bad');
        setTimeout(() => msg.classList.remove('bad'), 1500);
      }
      return false;
    };
    const scanner = new Scanner(el.querySelector('video'), tryText);

    el.addEventListener('click', async e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'close') finish(null);
      if (a === 'torch') { el.classList.toggle('torch-on'); scanner.torch(el.classList.contains('torch-on')); }
      if (a === 'manual') {
        const { dialog } = await import('./util.js');
        const v = await dialog({
          title: 'Code secret',
          body: `<label class="field"><span>Le code est écrit sous le QR code</span><input id="mc" class="code-input" autocomplete="off" autocapitalize="characters" maxlength="12" placeholder="ABCDE"></label>`,
          actions: [{ label: 'Annuler', value: null }, { label: 'Valider', primary: true, value: w => w.querySelector('#mc').value }],
        });
        if (v) tryText(v.trim().toUpperCase());
      }
    });

    scanner.start().then(() => {
      if (scanner.torchSupported) el.querySelector('[data-a=torch]').hidden = false;
    }).catch(err => {
      console.warn(err);
      msg.innerHTML = 'La caméra n\'est pas accessible.<br>Autorise-la dans les réglages du navigateur, ou tape le code.';
      el.classList.add('nocam');
      if (!manual) toast('Caméra indisponible');
    });
  });
}
