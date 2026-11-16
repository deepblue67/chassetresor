// Espace organisateur : mes chasses et chasses toutes prêtes.
import { topbar } from '../ui.js';
import { listHunts, saveHunt, deleteHunt } from '../store.js';
import { esc, dialog, confirmDialog, toast, pickFile } from '../util.js';
import { theme } from '../themes.js';
import { newHunt, reidentify, sanitize, AGES, MODES, checkHunt } from '../hunt.js';
import { templateList, instantiate } from '../templates.js';
import { go } from '../app.js';

export default async function org(app) {
  const hunts = (await listHunts()).filter(h => !h.demo);
  const templates = templateList();

  app.innerHTML = `
    ${topbar({ title: 'Organiser', back: '#/' })}
    <div class="page">
      <button class="btn big primary" id="new"><span class="btn-emoji">✏️</span><span class="btn-text">Créer une chasse<small>Étape par étape, avec la bibliothèque d'énigmes</small></span></button>

      <h2 class="section-title">Mes chasses</h2>
      ${hunts.length ? `<div class="hunt-list">${hunts.map(h => {
        const th = theme(h.theme);
        const errs = checkHunt(h).filter(i => i.level === 'error').length;
        return `
          <div class="hunt-card" style="--tc:${th.colors.bg}">
            <a class="hunt-main" href="#/edit/${h.id}">
              <span class="hunt-emoji">${th.emoji}</span>
              <span class="hunt-info"><b>${esc(h.name)}</b>
                <small>${MODES[h.mode].emoji} ${h.steps.length} étape${h.steps.length > 1 ? 's' : ''}, ${AGES[h.age]}${h.received ? ', reçue' : ''}</small>
                ${errs ? `<small class="warn">⚠️ ${errs} point${errs > 1 ? 's' : ''} à compléter</small>` : '<small class="ok">✓ Prête à jouer</small>'}
              </span>
            </a>
            <button class="icon-btn" data-more="${h.id}" aria-label="Plus d'actions">⋯</button>
          </div>`;
      }).join('')}</div>` : `<p class="muted">Aucune chasse pour l'instant. Crée la tienne ou pars d'une chasse toute prête.</p>`}

      <h2 class="section-title">Chasses toutes prêtes</h2>
      <div class="template-grid">
        ${templates.map(({ meta, hunt }) => {
          const th = theme(hunt.theme);
          return `
            <button class="template-card" data-tpl="${meta.id}" style="--tc:${th.colors.bg};--tc2:${th.colors.accent}">
              <span class="tpl-emoji">${th.emoji}</span>
              <b>${esc(meta.title)}</b>
              <span class="tpl-blurb">${esc(meta.blurb)}</span>
              <span class="tpl-tags"><span>${MODES[hunt.mode].emoji} ${esc(meta.where)}</span><span>${AGES[hunt.age]}</span><span>⏱ ${esc(meta.duration)}</span></span>
            </button>`;
        }).join('')}
      </div>

      <div class="row center">
        <button class="btn small" id="import">📂 Importer un fichier de chasse</button>
      </div>
    </div>`;

  app.querySelector('#new').onclick = async () => {
    const h = newHunt();
    await saveHunt(h);
    go('edit/' + h.id);
  };

  app.querySelectorAll('[data-tpl]').forEach(b => b.onclick = async () => {
    const t = templates.find(x => x.meta.id === b.dataset.tpl);
    const th = theme(t.hunt.theme);
    const ok = await dialog({
      title: `${th.emoji} ${t.meta.title}`,
      body: `<p>${esc(t.meta.blurb)}</p>
        <ul class="plain">
          <li>${t.hunt.steps.length} étapes, ${AGES[t.hunt.age]}, ${MODES[t.hunt.mode].label}</li>
          ${t.meta.setup ? `<li>👉 ${esc(t.meta.setup)}</li>` : '<li>👉 Adapte les cachettes à ta maison, imprime les QR codes, cache-les.</li>'}
          <li>👉 Écris où se trouve le coffre dans le message final.</li>
        </ul>`,
      actions: [{ label: 'Annuler', value: false }, { label: 'Utiliser cette chasse', primary: true, value: true }],
    });
    if (!ok) return;
    const h = instantiate(t.meta.id);
    await saveHunt(h);
    toast('Chasse ajoutée à « Mes chasses »');
    go('edit/' + h.id);
  });

  app.querySelectorAll('[data-more]').forEach(b => b.onclick = async () => {
    const h = hunts.find(x => x.id === b.dataset.more);
    const r = await dialog({
      title: h.name,
      actions: [
        { label: '✏️ Modifier', value: 'edit' },
        { label: '📤 Partager / lancer', value: 'share' },
        { label: '🖨️ Imprimer les QR codes', value: 'print' },
        { label: '🧪 Tester', value: 'test' },
        { label: '📄 Dupliquer', value: 'dup' },
        { label: '🗑️ Supprimer', value: 'del', danger: true },
        { label: 'Fermer', value: null },
      ],
    });
    if (r === 'edit') go('edit/' + h.id);
    if (r === 'share') go('partager/' + h.id);
    if (r === 'print') go('imprimer/' + h.id);
    if (r === 'test') go(`depart/${h.id}/test`);
    if (r === 'dup') {
      const c = reidentify(h);
      c.name = h.name + ' (copie)';
      delete c.received;
      await saveHunt(c);
      toast('Copie créée. Attention : ses QR codes sont nouveaux.');
      org(app);
    }
    if (r === 'del' && await confirmDialog('Supprimer cette chasse ?', `« ${esc(h.name)} » sera effacée de ce téléphone.`, 'Supprimer', true)) {
      await deleteHunt(h.id);
      org(app);
    }
  });

  app.querySelector('#import').onclick = async () => {
    const f = await pickFile('.json,.chasse,application/json');
    if (!f) return;
    try {
      const h = sanitize(JSON.parse(await f.text()));
      await saveHunt(h);
      toast('Chasse importée');
      go('edit/' + h.id);
    } catch { toast('Ce fichier n\'est pas une chasse au trésor.', 'bad'); }
  };
}
