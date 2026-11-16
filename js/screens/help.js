import { topbar } from '../ui.js';

export default function help(app) {
  app.innerHTML = `
    ${topbar({ title: 'Comment ça marche', back: '#/' })}
    <div class="page help-page">
      <section class="card">
        <h2 class="card-title">Pour l'organisateur</h2>
        <ol class="steps-howto">
          <li><b>Choisis une chasse</b> toute prête, ou crée la tienne avec la bibliothèque d'énigmes.</li>
          <li><b>Adapte les cachettes</b> : écris un indice pour chaque endroit (« là où dorment les bottes de papa »).</li>
          <li><b>Imprime les QR codes</b>, découpe-les et cache-les. En mode GPS, place les étapes sur la carte ou enregistre-les en marchant.</li>
          <li><b>Prépare le coffre</b> : un vrai cadenas à code, ou le cadenas de l'appli. Écris où il est caché dans le message final.</li>
          <li><b>Lance la chasse</b> sur ton téléphone, ou fais scanner le QR de partage aux téléphones des équipes.</li>
        </ol>
      </section>

      <section class="card">
        <h2 class="card-title">Pour les joueurs</h2>
        <ol class="steps-howto">
          <li><b>Lisez l'indice</b> (ou écoutez-le avec 🔊) pour savoir où chercher.</li>
          <li><b>Trouvez le QR code</b> et scannez-le, ou approchez-vous du point avec le radar chaud/froid.</li>
          <li><b>Relevez le défi</b> : devinette, calcul, photo ou défi physique. Des indices arrivent si ça bloque.</li>
          <li><b>Gagnez un chiffre</b> du code secret. Avec tous les chiffres, on ouvre le coffre !</li>
        </ol>
      </section>

      <section class="card">
        <h2 class="card-title">Bon à savoir</h2>
        <ul class="plain">
          <li>📷 <b>Caméra et GPS</b> : accepte les autorisations au premier lancement. Si un QR code ne passe pas, tapez le code écrit dessous.</li>
          <li>🏠 <b>À l'intérieur</b>, le GPS est imprécis : utilise le mode QR. Dehors, il est fiable à 5-15 m près, un peu moins sous les arbres.</li>
          <li>🚸 <b>Sécurité</b> : en mode GPS, choisis une zone sans voitures, avec un adulte. Tu peux tracer une zone de jeu : une alerte sonne si une équipe en sort.</li>
          <li>🔒 <b>Espace organisateur</b> : dans une partie, touche ⋯ puis maintiens « Espace organisateur » pour débloquer une étape ou voir une réponse.</li>
          <li>🛡️ <b>Vie privée</b> : tout reste sur les téléphones. Aucune position ni photo n'est envoyée sur internet.</li>
          <li>🔋 <b>Batteries</b> : charge les téléphones avant. L'écran reste allumé pendant la partie.</li>
          <li>📲 <b>Installer l'appli</b> : sur iPhone, Partager puis « Sur l'écran d'accueil ». Sur Android, menu ⋮ puis « Installer l'application ». Elle marche ensuite même sans réseau (sauf la carte).</li>
        </ul>
      </section>
      <p class="muted center">Chasse au trésor, une appli de <a href="https://cdesmottes.fr" target="_blank" rel="noopener">cdesmottes.fr</a></p>
    </div>`;
}
