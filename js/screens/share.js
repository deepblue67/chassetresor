// Lancer la chasse : sur ce téléphone, ou l'envoyer aux téléphones des équipes.
import { topbar, toggle, empty } from '../ui.js';
import { getHunt } from '../store.js';
import { esc, toast, download, slug } from '../util.js';
import { theme, applyTheme } from '../themes.js';
import { packHunt, shareLink, checkHunt } from '../hunt.js';
import { qrSvg } from '../qr.js';

export default async function share(app, { id }) {
  const h = await getHunt(id);
  if (!h) { app.innerHTML = `<div class="page">${empty('🧐', 'Chasse introuvable', '', '<a class="btn primary" href="#/org">Retour</a>')}</div>`; return; }
  applyTheme(h.theme);
  const th = theme(h.theme);
  const errors = checkHunt(h).filter(i => i.level === 'error');
  const hasPhotos = h.steps.some(s => s.cluePhoto);
  let withPhotos = hasPhotos;

  app.innerHTML = `
    ${topbar({ title: 'Lancer la chasse', back: `#/edit/${h.id}` })}
    <div class="page">
      <div class="start-hero compact"><div class="start-emoji">${th.emoji}</div><h1>${esc(h.name)}</h1></div>
      ${errors.length ? `
        <div class="card issues bad"><h2 class="card-title">Il reste à compléter</h2>
          <ul>${errors.map(e => `<li>⛔ ${esc(e.text)}</li>`).join('')}</ul>
          <a class="btn small" href="#/edit/${h.id}">Compléter la chasse</a>
        </div>` : ''}

      <a class="btn big primary" href="#/depart/${h.id}"><span class="btn-emoji">📱</span><span class="btn-text">Jouer sur ce téléphone<small>Les enfants jouent avec ce téléphone</small></span></a>

      <section class="card share-card">
        <h2 class="card-title">Sur les téléphones des équipes</h2>
        <p>Ouvre l'appareil photo du téléphone d'une équipe et scanne ce QR code. La chasse s'ouvre et s'installe dessus.</p>
        <div class="share-qr" id="qr"></div>
        <p class="help" id="qrNote"></p>
        ${hasPhotos ? toggle('photos', 'Inclure les photos indices', withPhotos, 'Le lien sera plus long : le QR code peut ne pas suffire, utilise alors le lien ou le fichier.') : ''}
        <div class="row wrap">
          <button class="btn small" id="link">🔗 Partager le lien</button>
          <button class="btn small" id="file">📎 Envoyer le fichier</button>
        </div>
        ${h.teams > 1 ? `<p class="help">👥 ${h.teams} équipes : au départ, chaque téléphone choisit son numéro d'équipe${h.staggered ? ' et reçoit un ordre différent' : ''}.</p>` : ''}
      </section>

      <p class="hint-text">🔒 Les emplacements de cachette restent sur ton téléphone : ils ne sont pas envoyés aux équipes.</p>
    </div>`;

  const $ = q => app.querySelector(q);
  let link = '';
  async function draw() {
    const packed = await packHunt(h, { photos: withPhotos });
    link = shareLink(packed);
    let svg = qrSvg(link, { ecc: 'L', margin: 3 });
    const note = $('#qrNote');
    if (!svg && withPhotos) {
      svg = qrSvg(shareLink(await packHunt(h, { photos: false })), { ecc: 'L', margin: 3 });
      note.textContent = 'Ce QR code contient la chasse sans les photos. Pour les photos, envoie le lien ou le fichier.';
    } else note.textContent = svg ? '' : 'La chasse est trop grande pour un QR code : envoie le lien ou le fichier.';
    $('#qr').innerHTML = svg || '<div class="qr-too-big">📦</div>';
  }
  $('#photos')?.addEventListener('change', e => { withPhotos = e.target.checked; draw(); });

  $('#link').onclick = async () => {
    const data = { title: h.name, text: `Chasse au trésor « ${h.name} » : ouvre ce lien pour jouer !`, url: link };
    if (navigator.share) { try { await navigator.share(data); return; } catch { return; } }
    try { await navigator.clipboard.writeText(link); toast('Lien copié !'); } catch { prompt('Copie ce lien :', link); }
  };
  $('#file').onclick = async () => {
    const copy = structuredClone(h);
    copy.steps.forEach(s => { delete s.hide; if (!withPhotos) s.cluePhoto = null; });
    const json = JSON.stringify(copy);
    const name = `${slug(h.name)}.chasse.json`;
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: h.name }); return; } catch { return; } }
    download(name, json);
    toast('Fichier enregistré');
  };
  draw();
}
