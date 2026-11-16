# 🗺️ Chasse au trésor

Une appli web pour organiser et jouer des chasses au trésor en famille ou entre amis : énigmes, QR codes cachés, radar GPS « chaud / froid », cadenas à code et diplôme de fin.

**Démo : https://chassetresor.cdesmottes.fr**

Elle s'installe sur le téléphone comme une vraie appli (PWA) et fonctionne ensuite sans réseau. Il n'y a ni serveur, ni compte, ni publicité : tout reste sur les téléphones.

## Ce qu'elle sait faire

**Pour les joueurs**
- Trois modes : **QR** (maison, jardin), **GPS** (parc, forêt, village) et **mixte** (le GPS guide, le QR caché valide).
- **Radar chaud / froid** avec bips et vibrations qui s'accélèrent. On peut aussi choisir une **boussole** avec la distance, ou une **carte**.
- Des défis variés : devinettes, choix multiples, calculs, **défis photo** et défis physiques validés par un adulte.
- **Trois indices progressifs** par énigme, qui se débloquent avec le temps.
- **Lecture à voix haute** des indices pour les petits lecteurs.
- Chaque étape donne un **chiffre du code** (ou une lettre du mot mystère). À la fin, on ouvre le cadenas : un vrai, ou celui de l'appli avec ses molettes.
- Un **diplôme** imprimable ou partageable, avec le nom de l'équipe, son chrono, ses étoiles et la photo souvenir.
- Cinq univers : pirates, agents secrets, dinosaures, licornes et explorateurs. Chacun a ses couleurs, ses textes et ses sons.

**Pour l'organisateur**
- **Six chasses toutes prêtes**, dont une démo qui se joue sans rien cacher.
- Un éditeur d'étapes avec une **bibliothèque d'environ 70 énigmes**, classées par âge (4-6, 7-9 et 10-12 ans).
- Le placement des balises se fait **sur une carte OpenStreetMap** ou **en marchant**, avec « Enregistrer ma position ici » (la position est une moyenne de plusieurs mesures).
- **La planche de QR codes est prête à imprimer**, ou à enregistrer en PDF. Une fiche organisateur l'accompagne, et un code de secours est imprimé sous chaque QR.
- **Jusqu'à 4 équipes**, chacune avec un ordre décalé. Toutes finissent sur la même dernière étape.
- Une **zone de jeu** peut être tracée : une alerte sonne si une équipe en sort.
- Un **mode test**, où des boutons « Simuler » remplacent le scan et le GPS.
- Un **espace adulte** pendant la partie : débloquer une étape, voir une réponse, recommencer.
- **Partage vers les téléphones des équipes** par QR code, par lien ou par fichier. Les cachettes restent sur le téléphone de l'organisateur.

**Anti-triche** : chaque QR code contient le code de sa chasse et de son étape. Un QR d'une autre chasse, ou d'une étape à venir, est refusé.

## Mettre l'appli en ligne sur GitHub Pages

1. **Créer le dépôt** sur GitHub (par exemple `chasse-tresor`, public), puis y envoyer les fichiers :
   ```bash
   cd chasse-tresor
   git init
   git add .
   git commit -m "Chasse au trésor v1"
   git branch -M main
   git remote add origin https://github.com/<ton-compte>/chasse-tresor.git
   git push -u origin main
   ```
2. **Activer GitHub Pages** : dans *Settings → Pages*, choisis *Deploy from a branch*, la branche `main` et le dossier `/ (root)`.
3. **Brancher le sous-domaine** : chez le registrar de `cdesmottes.fr`, ajoute un enregistrement DNS :
   | Type | Nom | Valeur |
   |---|---|---|
   | CNAME | `chassetresor` | `<ton-compte>.github.io.` |
4. Dans *Settings → Pages*, vérifie que le domaine personnalisé indique `chassetresor.cdesmottes.fr` (le fichier `CNAME` du dépôt le règle déjà). Une fois le certificat prêt, coche **Enforce HTTPS**. Cela peut prendre de quelques minutes à une heure.

Le **HTTPS est obligatoire** : sans lui, le navigateur refuse la caméra et le GPS. GitHub Pages le fournit.

## Installer sur le téléphone

- **iPhone (Safari)** : ouvre le site, touche *Partager*, puis *Sur l'écran d'accueil*.
- **Android (Chrome)** : menu ⋮, puis *Installer l'application*. Un bouton « Installer l'appli » apparaît aussi sur l'accueil.

## Tester sur l'ordinateur

```bash
cd chasse-tresor
python -m http.server 8000
```
Ouvre ensuite http://localhost:8000. La caméra et le GPS marchent aussi sur `localhost`.

## Organisation du code

Il n'y a pas d'étape de compilation : ce sont des fichiers statiques, en JavaScript moderne (modules ES).

```
index.html               page unique
manifest.webmanifest     installation en appli
sw.js                    hors ligne (cache de l'appli et des tuiles de carte déjà vues)
css/app.css              tout le style
js/app.js                routeur (#/...) et démarrage
js/hunt.js               modèle d'une chasse : création, vérifications, récompenses, équipes, partage
js/game.js               logique d'une partie
js/radar.js              radar chaud/froid, boussole, carte
js/qr.js                 génération et lecture des QR codes
js/geo.js                GPS, position moyenne, boussole
js/audio.js              sons synthétisés et lecture à voix haute
js/diploma.js            diplôme dessiné sur canvas
js/themes.js             les cinq univers
js/riddles.js            bibliothèque d'énigmes
js/templates.js          chasses toutes prêtes
js/screens/*.js          un fichier par écran
vendor/                  Leaflet, jsQR, qrcode-generator, polices Fredoka et Nunito
icons/                   icônes de l'appli et image de partage
```

**Ajouter une énigme** : complète `js/riddles.js`.
**Ajouter un univers** : ajoute une entrée dans `js/themes.js`.
**Après une modification**, change `VERSION` dans `sw.js` pour que les téléphones récupèrent la nouvelle version.

## Données et vie privée

- Les chasses et les photos restent dans le navigateur (IndexedDB), et la partie en cours dans le `localStorage`.
- Les positions GPS ne quittent jamais le téléphone.
- Les seules requêtes vers l'extérieur sont celles des tuiles de carte OpenStreetMap, quand une carte est affichée.

## Idées pour la suite

- Un tableau de bord parent en direct (positions des équipes, envoi d'un indice à distance), avec Supabase en option.
- Une galerie de chasses partagées par la communauté.

## Crédits

- Cartes : © les contributeurs d'[OpenStreetMap](https://www.openstreetmap.org/copyright), affichées avec [Leaflet](https://leafletjs.com) (BSD-2).
- Lecture des QR codes : [jsQR](https://github.com/cozmo/jsQR) (Apache-2.0).
- Génération des QR codes : [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT). « QR Code » est une marque déposée de DENSO WAVE.
- Polices : [Fredoka](https://fonts.google.com/specimen/Fredoka) et [Nunito](https://fonts.google.com/specimen/Nunito) (SIL Open Font License).

Une appli de [cdesmottes.fr](https://cdesmottes.fr).
