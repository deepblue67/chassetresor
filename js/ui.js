// Briques d'interface communes.
import { esc } from './util.js';
import { sfx } from './audio.js';

export function topbar({ title = '', back = null, right = '' } = {}) {
  return `
    <header class="topbar">
      ${back ? `<a class="icon-btn" href="${back}" aria-label="Retour">←</a>` : '<span class="icon-spacer"></span>'}
      <h1 class="topbar-title">${esc(title)}</h1>
      ${right || '<span class="icon-spacer"></span>'}
    </header>`;
}

export function chips(name, options, value, { small = false } = {}) {
  return `<div class="chips ${small ? 'small' : ''}" role="radiogroup" data-chips="${name}">
    ${Object.entries(options).map(([k, o]) => `
      <button type="button" class="chip ${String(k) === String(value) ? 'on' : ''}" role="radio" aria-checked="${String(k) === String(value)}" data-v="${esc(k)}">
        ${o.emoji ? `<span class="chip-emoji">${o.emoji}</span>` : ''}${esc(o.label ?? o.name ?? o)}
      </button>`).join('')}
  </div>`;
}

// Relie un groupe de puces à un callback
export function bindChips(root, name, onChange) {
  const g = root.querySelector(`[data-chips="${name}"]`);
  if (!g) return;
  g.addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    sfx.tap();
    g.querySelectorAll('.chip').forEach(c => { c.classList.toggle('on', c === b); c.setAttribute('aria-checked', c === b); });
    onChange(b.dataset.v);
  });
}

export function toggle(id, label, checked, desc = '') {
  return `<label class="toggle">
    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
    <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
    <span class="toggle-text"><b>${esc(label)}</b>${desc ? `<small>${esc(desc)}</small>` : ''}</span>
  </label>`;
}

export function empty(emoji, title, text, action = '') {
  return `<div class="empty"><div class="empty-emoji">${emoji}</div><h2>${esc(title)}</h2><p>${esc(text)}</p>${action}</div>`;
}

let leafletLoading;
export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!leafletLoading) {
    leafletLoading = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'vendor/leaflet/leaflet.css';
      document.head.appendChild(css);
      const s = document.createElement('script');
      s.src = 'vendor/leaflet/leaflet.js';
      s.onload = () => resolve(window.L);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return leafletLoading;
}

export function tileLayer(L) {
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });
}

export function numberIcon(L, label, { active = false, color = null } = {}) {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin ${active ? 'active' : ''}" ${color ? `style="--pin:${color}"` : ''}><span>${esc(label)}</span></div>`,
    iconSize: [40, 48],
    iconAnchor: [20, 46],
  });
}

export const meIcon = L => L.divIcon({ className: '', html: '<div class="map-me"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
