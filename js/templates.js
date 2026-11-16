// Chasses toutes prêtes : on choisit, on adapte les cachettes, on imprime, on joue.
import { newHunt, newStep, newChallenge, reidentify, HINT_DELAYS } from './hunt.js';

const ch = (type, q, extra = {}) => ({ ...newChallenge(type), q, ...extra });
const txt = (q, answers, hints, emoji) => ch('texte', q, { answers, hints, emoji });
const num = (q, a, hints, emoji) => ch('nombre', q, { answers: [String(a)], hints, emoji });
const qcm = (q, choices, correct, hints, emoji) => ch('qcm', q, { choices, correct, hints, emoji });
const photo = (q, emoji = '📸') => ch('photo', q, { emoji });
const adult = (q, emoji = '💪') => ch('adulte', q, { emoji });

function build(meta, hunt, steps) {
  const h = newHunt({ ...hunt, hintDelays: [...HINT_DELAYS[hunt.age]] });
  h.lock = { ...h.lock, ...(hunt.lock || {}) };
  h.steps = steps.map(s => newStep(h, s));
  return { meta, hunt: h };
}

export const TEMPLATES = [
  () => build(
    { id: 'demo', title: 'Démo express', blurb: 'Rien à cacher ni à imprimer : 4 étapes pour découvrir le jeu tout de suite.', where: 'Partout', duration: '5 min' },
    {
      name: 'Démo express', theme: 'pirates', age: '7-9', mode: 'qr',
      intro: 'Bienvenue, moussaillon ! Cette démo te montre comment se joue une chasse. Ici pas besoin de chercher de QR code : quand tu as « trouvé » l\'endroit, appuie sur le bouton.',
      finale: 'Dans une vraie chasse, ce message dit où est caché le coffre. Bravo, tu connais le jeu !',
      lock: { type: 'code', value: '742', real: false },
    },
    [
      { title: 'Le pont du navire', clue: 'Imagine que tu cherches sous la table du salon… Quand tu as trouvé, appuie sur « On a trouvé ! ».', validate: 'aucune', challenge: txt('Qu\'est-ce qui a des dents mais ne mord jamais ?', ['peigne'], ['On s\'en sert le matin.', 'Ça passe dans les cheveux.', 'Un pei…'], '🦷') },
      { title: 'La cale', clue: 'Cette fois, imagine un indice caché derrière un pot de fleurs.', validate: 'aucune', challenge: qcm('Combien de couleurs y a-t-il dans un arc-en-ciel ?', ['5', '7', '9'], 1, ['Rouge, orange, jaune, vert…', '… bleu, indigo, violet.', '7 couleurs.'], '🌈') },
      { title: 'La cabine du capitaine', clue: 'Dernier effort : le capitaine a caché un message près de son lit.', validate: 'aucune', challenge: num('Le pirate a 12 pièces d\'or. Il en donne la moitié à son perroquet. Combien lui en reste-t-il ?', 6, ['La moitié, c\'est partager en deux.', '12 partagé en 2…', 'Il lui en reste 6.'], '🪙') },
      { title: 'L\'île au trésor', clue: 'Le coffre n\'est plus très loin… Fais un vrai défi pour finir !', validate: 'aucune', challenge: adult('Fais ta meilleure imitation de perroquet devant un adulte.', '🦜') },
    ],
  ),

  () => build(
    { id: 'pirates-maison', title: 'Le trésor de Barbe-Grise', blurb: '6 étapes dans la maison. Énigmes, charades et défi photo.', where: 'Maison', duration: '30-45 min' },
    {
      name: 'Le trésor de Barbe-Grise', theme: 'pirates', age: '7-9', mode: 'qr',
      intro: 'Le terrible capitaine Barbe-Grise a caché son trésor dans cette maison ! Il a semé des indices partout. Résolvez ses énigmes pour récupérer les chiffres du cadenas de son coffre.',
      finale: 'Le coffre de Barbe-Grise est caché… (écris ici où se trouve le vrai coffre, par exemple : dans le panier à linge !)',
      lock: { type: 'code', value: '0000', real: false, randomize: true },
    },
    [
      { title: 'La cambuse', clue: 'Là où l\'on garde le froid, même en plein été.', hide: 'Sur la porte du réfrigérateur', clueHint: 'Il fait « vrrr » dans la cuisine.', challenge: txt('Mon premier est le contraire de « haut ». Mon second veut dire « pas en retard ». Mon tout flotte sur la mer.', ['bateau'], ['Premier : bas.', 'Second : tôt.', 'Bas + tôt…'], '⛵') },
      { title: 'Le lagon', clue: 'Ici, on se lave et on fait des bulles.', hide: 'Près de la baignoire ou de la douche', clueHint: 'Ça sent bon le savon.', challenge: txt('Plus je sèche, plus je suis mouillée. Qui suis-je ?', ['serviette'], ['On m\'utilise après le bain.', 'Je suis en tissu.', 'Une ser…'], '🛁') },
      { title: 'Le port', clue: 'Là où dorment les chaussures de toute la famille.', hide: 'Dans le meuble à chaussures', clueHint: 'Près de la porte d\'entrée.', challenge: txt('Mon premier est le contraire de « froid ». Mon second est le nombre après six. Mon tout se met au pied.', ['chaussette', 'chaussettes'], ['Premier : chaud.', 'Second : sept.', 'Chaud + sept…'], '🧦') },
      { title: 'La vigie', clue: 'Je montre l\'heure sans jamais parler.', hide: 'Derrière une horloge ou un réveil', clueHint: 'Tic, tac, tic, tac…', challenge: num('Une araignée a 8 pattes. Combien de pattes ont 3 araignées ?', 24, ['8 + 8 + 8', 'Ou 3 fois 8.', '24 pattes.'], '🕷️') },
      { title: 'La cabine', clue: 'Le capitaine y pose sa tête chaque nuit.', hide: 'Sous un oreiller', clueHint: 'C\'est tout doux et c\'est sur un lit.', challenge: photo('Prenez la pose de pirates à l\'abordage, avec votre plus terrible grimace !', '🏴‍☠️') },
      { title: 'La plonge', clue: 'Là où l\'on lave les assiettes après le repas.', hide: 'Sous l\'évier', clueHint: 'Il y a un robinet.', challenge: num('Le pirate a 12 pièces d\'or. Il en donne la moitié à son perroquet. Combien lui en reste-t-il ?', 6, ['La moitié, c\'est partager en deux.', '12 partagé en 2…', 'Il lui en reste 6.'], '🪙') },
    ],
  ),

  () => build(
    { id: 'espions-maison', title: 'Opération Œil-de-Lynx', blurb: '7 missions pour agents de 10-12 ans : codes secrets, logique et pièges.', where: 'Maison', duration: '45-60 min' },
    {
      name: 'Opération Œil-de-Lynx', theme: 'espions', age: '10-12', mode: 'qr',
      intro: 'Agents, un dossier top secret a été dissimulé dans ce bâtiment. Chaque mission réussie vous livre un fragment du code de la mallette. Ce message s\'autodétruira… non, en fait il reste là.',
      finale: 'La mallette est dissimulée… (écris ici l\'emplacement du vrai coffre)',
      lock: { type: 'code', value: '0000', real: true, randomize: true },
    },
    [
      { title: 'Archives', clue: 'Le QG a caché la première preuve là où l\'on range les histoires.', hide: 'Dans la bibliothèque, entre deux livres', challenge: txt('Décode ce message (chaque lettre est remplacée par la suivante dans l\'alphabet : A devient B…) : USFTPS', ['tresor'], ['U devient T.', 'S devient R, F devient E…', 'T R E…'], '🔐') },
      { title: 'Écoute', clue: 'Cherchez là où l\'on écoute de la musique ou les informations.', hide: 'Près de la radio ou de l\'enceinte', challenge: txt('Lis à l\'envers : ETERCES NOISSIM', ['mission secrete'], ['Commence par la fin.', 'Le deuxième mot commence par M.', 'Mission sec…'], '🪞') },
      { title: 'Laboratoire', clue: 'Dans la pièce où l\'on cuisine, là où dorment les épices.', hide: 'Dans le placard à épices', challenge: num('Je suis un nombre. Multiplié par 4 puis augmenté de 6, je fais 30. Qui suis-je ?', 6, ['Enlève d\'abord 6 à 30.', '24 divisé par 4…', 'C\'est 6.'], '🧮') },
      { title: 'Reflet', clue: 'Là où chacun se regarde chaque matin.', hide: 'Près d\'un miroir', challenge: txt('Plus j\'ai de gardiens, moins je suis gardé. Qui suis-je ?', ['secret'], ['On le confie à voix basse.', 'Si tout le monde le connaît, je n\'existe plus.', 'Un sec…'], '🤫') },
      { title: 'Télécommande', clue: 'Sous l\'objet qui change les chaînes sans qu\'on se lève.', hide: 'Sous la télécommande', challenge: num('3 chats attrapent 3 souris en 3 minutes. Combien de chats faut-il pour attraper 100 souris en 100 minutes ?', 3, ['Un chat attrape une souris en 3 minutes.', 'En 100 minutes, un chat en attrape environ 33.', 'Toujours 3 chats !'], '🐈') },
      { title: 'Repérage', clue: 'Là où l\'on pose ses clés en rentrant.', hide: 'Près du vide-poche ou du porte-clés', challenge: photo('Photographiez trois objets dont le nom commence par la lettre T.', '🔍') },
      { title: 'Extraction', clue: 'Dernière mission : là où l\'on accroche son manteau.', hide: 'Au porte-manteau', challenge: adult('Inventez et chantez le cri de ralliement de votre brigade.', '📣') },
    ],
  ),

  () => build(
    { id: 'dinos-petits', title: 'L\'œuf perdu du T-Rex', blurb: '5 étapes très simples pour les 4-6 ans, avec lecture à voix haute.', where: 'Maison ou jardin', duration: '20 min' },
    {
      name: 'L\'œuf perdu du T-Rex', theme: 'dinos', age: '4-6', mode: 'qr',
      intro: 'Oh non ! Maman T-Rex a perdu son œuf. Aide-la à le retrouver en suivant les empreintes. À chaque étape, tu gagnes un chiffre pour ouvrir le nid.',
      finale: 'Le nid de l\'œuf est caché… (écris ici où est le trésor)',
      lock: { type: 'code', value: '000', real: false, randomize: true },
    },
    [
      { title: 'Le marécage', clue: 'Va là où l\'on prend son bain.', hide: 'Dans la salle de bain', challenge: qcm('Quel animal pond des œufs, comme les dinosaures ?', ['🐕 Le chien', '🐔 La poule', '🐄 La vache'], 1, ['Elle fait « cot cot ».', 'Elle vit à la ferme.', 'La poule !'], '🥚') },
      { title: 'La grotte', clue: 'Cherche sous la table où l\'on mange.', hide: 'Sous la table de la salle à manger', challenge: photo('Faites tous le cri du T-Rex et prenez une photo !', '🦖') },
      { title: 'Le nid douillet', clue: 'Va tout près de ton lit.', hide: 'Au pied du lit', challenge: num('Compte les œufs : 🥚🥚🥚🥚 Combien y en a-t-il ?', 4, ['Compte avec ton doigt.', 'Un, deux, trois…', 'Il y en a 4.'], '🥚') },
      { title: 'La forêt', clue: 'Cherche là où dorment tes jouets.', hide: 'Dans le coffre à jouets', challenge: adult('Marchez comme un dinosaure en faisant « ROAAR » jusqu\'à l\'adulte.', '🦕') },
      { title: 'La montagne de glace', clue: 'Va là où l\'on garde le froid.', hide: 'Sur le réfrigérateur', challenge: qcm('De quelle couleur sont les feuilles que mangent les dinosaures ?', ['🟦 Bleues', '🟩 Vertes', '🟪 Violettes'], 1, ['Comme l\'herbe.', 'Comme une grenouille.', 'Vertes !'], '🌿') },
    ],
  ),

  () => build(
    { id: 'licornes-parc', title: 'La forêt des licornes', blurb: 'Chasse GPS au parc avec radar chaud/froid. Place les 5 étoiles sur la carte.', where: 'Parc', duration: '40 min', setup: 'Place chaque étape sur la carte ou enregistre-la en marchant.' },
    {
      name: 'La forêt des licornes', theme: 'licornes', age: '7-9', mode: 'gps', nav: 'radar',
      intro: 'Les licornes ont perdu leurs étoiles magiques dans le parc ! Suivez le radar : plus il devient rose et chaud, plus vous êtes près. Chaque étoile vous donne une lettre du mot magique.',
      finale: 'La corne de lumière est cachée… (écris ici où est le trésor)',
      lock: { type: 'mot', value: 'MAGIE', real: false },
    },
    [
      { title: 'L\'étoile du grand arbre', clue: 'Cherchez le plus grand arbre du parc.', validate: 'gps', challenge: txt('J\'ai des aiguilles mais je ne couds jamais. Qui suis-je ?', ['horloge', 'montre', 'pendule', 'sapin', 'herisson', 'cactus'], ['Il y a plusieurs bonnes réponses !', 'Je peux faire tic-tac…', 'Une horloge, un sapin ou un hérisson !'], '🪡') },
      { title: 'L\'étoile du banc', clue: 'Les licornes se reposent sur un banc.', validate: 'gps', challenge: photo('Prenez une photo de l\'équipe en licornes : un doigt sur le front pour faire la corne !', '🦄') },
      { title: 'L\'étoile de l\'eau', clue: 'Approchez-vous de l\'eau, mais pas trop !', validate: 'gps', challenge: qcm('Combien de couleurs y a-t-il dans un arc-en-ciel ?', ['5', '7', '9'], 1, ['Rouge, orange, jaune, vert…', '… bleu, indigo, violet.', '7 couleurs.'], '🌈') },
      { title: 'L\'étoile des fleurs', clue: 'Là où poussent les fleurs.', validate: 'gps', challenge: adult('Faites une ronde magique en chantant pendant 10 secondes.', '🌸') },
      { title: 'L\'étoile du départ', clue: 'Revenez au point de départ, la dernière étoile vous attend.', validate: 'gps', challenge: num('Dans un panier il y a 5 œufs. La poule en pond 3 de plus, puis on en mange 2. Combien en reste-t-il ?', 6, ['5 + 3 = 8', 'Puis on en enlève 2.', 'Il en reste 6.'], '🥚') },
    ],
  ),

  () => build(
    { id: 'explo-village', title: 'Le temple perdu', blurb: 'Chasse mixte pour les grands : le GPS guide vers la zone, le QR caché valide.', where: 'Village, vacances', duration: '1 h', setup: 'Place chaque étape, puis imprime et cache les QR codes sur place.' },
    {
      name: 'Le temple perdu', theme: 'explorateurs', age: '10-12', mode: 'mixte', nav: 'boussole',
      intro: 'Un vieux carnet d\'explorateur décrit un temple perdu dans les environs. Suivez la boussole jusqu\'à chaque zone, puis fouillez pour trouver la marque du temple (le QR code).',
      finale: 'L\'idole d\'or est cachée… (écris ici où est le trésor)',
      lock: { type: 'code', value: '0000', real: true, randomize: true },
    },
    [
      { title: 'La place du village', clue: 'Commencez là où les gens se retrouvent.', validate: 'gpsqr', challenge: txt('J\'ai des villes mais pas de maisons, des forêts mais pas d\'arbres, de l\'eau mais pas de poissons. Qui suis-je ?', ['carte', 'plan'], ['On me déplie.', 'Les explorateurs m\'emportent.', 'Une car…'], '🗺️') },
      { title: 'La fontaine', clue: 'L\'eau coule ici depuis des siècles.', validate: 'gpsqr', challenge: c4() },
      { title: 'Le vieux mur', clue: 'Cherchez des pierres très anciennes.', validate: 'gpsqr', challenge: num('Un escargot monte un mur de 5 m. Le jour il monte 3 m, la nuit il glisse de 2 m. En combien de jours atteint-il le haut ?', 3, ['Il gagne 1 m par jour et nuit.', 'Le 3e jour, il part de 2 m.', '3 jours.'], '🐌') },
      { title: 'Le grand arbre', clue: 'Un géant vert veille sur le chemin.', validate: 'gpsqr', challenge: txt('Je répète tout ce que tu dis, mais seulement dans la montagne ou les grandes salles. Qui suis-je ?', ['echo'], ['Crie « Ohé ! » dans une grotte.', 'Ohé… ohé… ohé…', 'L\'é…'], '⛰️') },
      { title: 'Le point de vue', clue: 'Montez là d\'où l\'on voit loin.', validate: 'gpsqr', challenge: photo('Prenez une photo de l\'expédition avec le plus beau paysage derrière vous.', '🏞️') },
      { title: 'L\'entrée du temple', clue: 'Le temple est tout proche du point de départ…', validate: 'gpsqr', challenge: num('2, 4, 8, 16… Quel est le nombre suivant ?', 32, ['Chaque nombre double.', '16 + 16', '32.'], '📈') },
    ],
  ),
];

function c4() {
  return qcm('Quel est le plus long fleuve de France ?', ['La Seine', 'Le Rhône', 'La Loire'], 2, ['Il traverse Orléans et Nantes.', 'Il est connu pour ses châteaux.', 'La Loire.'], '🏰');
}

export function templateList() {
  return TEMPLATES.map(f => f());
}
export function instantiate(id) {
  const t = templateList().find(x => x.meta.id === id);
  if (!t) return null;
  const h = reidentify(t.hunt);
  h.fromTemplate = id;
  return h;
}
