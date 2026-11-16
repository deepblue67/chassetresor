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
  // ===================== 8-11 ans =====================
  () => build(
    { id: 'diamant-bleu', title: 'Le vol du diamant bleu', blurb: 'Une enquête dans la maison : codes secrets, charades et logique pour retrouver le diamant volé.', where: 'Maison', duration: '40 min' },
    {
      name: 'Le vol du diamant bleu', theme: 'enquete', age: '8-11', mode: 'qr',
      intro: 'Le diamant bleu du musée a disparu cette nuit ! Le voleur a laissé des indices un peu partout dans la maison. Inspecteurs, à vous de jouer : chaque indice résolu révèle un chiffre du coffre où il a caché son butin.',
      finale: 'Le diamant est enfermé… (écris ici où se trouve le vrai coffre)',
      lock: { type: 'code', value: '0000', real: false, randomize: true },
    },
    [
      { title: 'La scène du vol', clue: 'Le voleur est entré par là où tout le monde entre.', hide: 'Près de la porte d\'entrée', clueHint: 'Regarde près des clés et des manteaux.', challenge: txt('Code secret : A=1, B=2, C=3… Déchiffre 3-1-4-5-1-21', ['cadeau'], ['3 = C, 1 = A.', 'Le mot commence par CAD.', 'On en reçoit à Noël.'], '🎁') },
      { title: 'L\'empreinte', clue: 'Une empreinte de chaussure mène tout droit… au meuble à chaussures.', hide: 'Dans le meuble à chaussures', challenge: num('Combien de pattes ont, ensemble, 3 poules et 2 chats ?', 14, ['Une poule a 2 pattes.', '3 × 2 = 6 et 2 × 4 = 8.', '6 + 8 = 14.'], '🐾') },
      { title: 'Le témoin endormi', clue: 'Le seul témoin dormait à poings fermés. Cherchez près de son lit.', hide: 'Sous un oreiller', challenge: txt('Plus il y en a, moins on voit. Qu\'est-ce que c\'est ?', ['noir', 'obscurite', 'nuit', 'brouillard'], ['Ça arrive le soir.', 'On allume la lumière pour le chasser.', 'Le n…'], '🌑') },
      { title: 'Le goûter du voleur', clue: 'Le voleur avait faim : il a fouillé là où l\'on range les gâteaux.', hide: 'Dans le placard à goûters', challenge: txt('Mon premier veut dire « pas en retard ». Mon deuxième est le féminin de « mon ». Mon troisième se boit chaud. Mon tout est un fruit rouge.', ['tomate'], ['Premier : tôt.', 'Deuxième : ma. Troisième : thé.', 'Tô + ma + thé…'], '🍅') },
      { title: 'La mélodie', clue: 'Pour patienter, il a écouté de la musique.', hide: 'Près de l\'enceinte, de la radio ou d\'un instrument', challenge: txt('J\'ai des touches mais je n\'ouvre aucune porte. Qui suis-je ?', ['piano', 'clavier'], ['On joue de la musique avec moi.', 'Mes touches sont noires et blanches.', 'Un pia…'], '🎹') },
      { title: 'La planque', clue: 'Dernière piste : là où l\'on accroche les manteaux.', hide: 'Dans le placard à manteaux', challenge: photo('Prenez une photo de la brigade en inspecteurs, loupe (ou objet qui fait loupe) à la main.', '🔎') },
    ],
  ),

  () => build(
    { id: 'ile-tortue', title: 'Les naufragés de l\'île Tortue', blurb: 'Survie au jardin : 6 épreuves pour reconstituer le mot de passe du coffre de secours.', where: 'Jardin', duration: '40 min' },
    {
      name: 'Les naufragés de l\'île Tortue', theme: 'pirates', age: '8-11', mode: 'qr',
      intro: 'Votre navire a fait naufrage sur l\'île Tortue ! Pour être secourus, il faut ouvrir le coffre de survie. Chaque épreuve réussie vous donne une lettre du mot de passe… mais dans le désordre !',
      finale: 'Le coffre de survie est caché… (écris ici où se trouve le trésor)',
      lock: { type: 'mot', value: 'TORTUE', real: false },
    },
    [
      { title: 'La plage', clue: 'Là où l\'on s\'essuie les pieds avant d\'entrer.', hide: 'Sous le paillasson', challenge: txt('Remets les lettres dans l\'ordre pour trouver un animal marin : QUINER', ['requin'], ['Il a beaucoup de dents.', 'Il commence par R.', 'Le req…'], '🦈') },
      { title: 'La source', clue: 'Trouvez l\'eau douce : robinet, arrosoir ou tuyau.', hide: 'Près du robinet extérieur ou de l\'arrosoir', challenge: num('Le capitaine partage 48 pièces d\'or entre 6 pirates. Combien chacun en reçoit-il ?', 8, ['C\'est une division.', '6 × 8 = ?', '8 pièces chacun.'], '🪙') },
      { title: 'La forêt', clue: 'Le géant du jardin : le plus grand arbre ou arbuste.', hide: 'Au pied du plus grand arbre', challenge: qcm('Lequel de ces animaux est un mammifère ?', ['Le requin', 'Le dauphin', 'Le saumon'], 1, ['Il respire de l\'air.', 'Il allaite ses petits.', 'Le dauphin.'], '🐬') },
      { title: 'La grotte', clue: 'Un abri sombre où dorment les outils.', hide: 'Dans la cabane, l\'abri de jardin ou le garage', challenge: txt('Je suis noir quand tu m\'achètes, rouge quand tu m\'utilises et gris quand tu me jettes. Qui suis-je ?', ['charbon'], ['On m\'utilise pour le barbecue.', 'Je brûle.', 'Le char…'], '🔥') },
      { title: 'Le campement', clue: 'Là où l\'on mange dehors quand il fait beau.', hide: 'Sous la table du jardin', challenge: adult('Fabriquez un bateau en papier et faites-le flotter (dans une bassine ou une flaque) devant un adulte.', '⛵') },
      { title: 'Le phare', clue: 'Ce qui brille dans le jardin quand la nuit tombe.', hide: 'Près d\'une lampe ou d\'une guirlande extérieure', challenge: qcm('Quel est le plus grand océan du monde ?', ['Atlantique', 'Indien', 'Pacifique'], 2, ['Il touche l\'Asie et l\'Amérique.', 'Son nom veut dire « calme ».', 'Le Pacifique.'], '🌊') },
    ],
  ),

  () => build(
    { id: 'jurassique-parc', title: 'Expédition Jurassique', blurb: 'Chasse GPS au parc avec le radar chaud/froid : 5 nids de dinosaures à localiser.', where: 'Parc', duration: '45 min', setup: 'Place les 5 nids sur la carte ou enregistre-les en marchant dans le parc.' },
    {
      name: 'Expédition Jurassique', theme: 'dinos', age: '8-11', mode: 'gps', nav: 'radar',
      intro: 'Des œufs de dinosaures ont été repérés dans le parc ! Suivez le radar : plus il chauffe, plus un nid est proche. Chaque nid trouvé livre un chiffre du code de la caisse d\'expédition.',
      finale: 'La caisse d\'expédition est cachée… (écris ici où est le trésor)',
      lock: { type: 'code', value: '000', real: false, randomize: true },
    },
    [
      { title: 'Le nid du Brachiosaure', clue: 'Il broute les feuilles les plus hautes : trouvez un très grand arbre.', validate: 'gps', challenge: qcm('Quel dinosaure avait un très long cou ?', ['Le T-Rex', 'Le Brachiosaure', 'Le Tricératops'], 1, ['Il mangeait des feuilles en hauteur.', 'Son nom commence par B.', 'Le Brachiosaure.'], '🦕') },
      { title: 'La mare des Ptérosaures', clue: 'Les Ptérosaures se posent près de l\'eau.', validate: 'gps', challenge: num('Un Tricératops a 3 cornes. Combien de cornes ont 7 Tricératops ?', 21, ['C\'est une multiplication.', '7 × 3', '21 cornes.'], '🦏') },
      { title: 'La clairière des Raptors', clue: 'Un grand espace d\'herbe où les Raptors aiment courir.', validate: 'gps', challenge: adult('Course de Raptors : tout le monde court jusqu\'à l\'adulte avec des petits bras de dinosaure !', '🦖') },
      { title: 'Le volcan', clue: 'Le point le plus haut du parc : une butte, un talus, un toboggan…', validate: 'gps', challenge: txt('Les dinosaures ont disparu il y a 66 millions d\'années, sûrement après la chute d\'un énorme… quoi ?', ['meteorite', 'asteroide', 'comete', 'meteore'], ['Ça venait de l\'espace.', 'Un gros caillou céleste.', 'Une météo…'], '☄️') },
      { title: 'Le dernier fossile', clue: 'Revenez au point de départ : le dernier œuf vous y attend.', validate: 'gps', challenge: photo('Photographiez l\'équipe figée en squelette de dinosaure, comme au musée !', '🦴') },
    ],
  ),

  () => build(
    { id: 'pyramide', title: 'Le secret de la pyramide', blurb: 'Les salles d\'un temple égyptien cachées dans la maison, et un mot sacré à reconstituer.', where: 'Maison', duration: '40 min' },
    {
      name: 'Le secret de la pyramide', theme: 'explorateurs', age: '8-11', mode: 'qr',
      intro: 'Un archéologue a retrouvé la carte d\'une pyramide cachée… dans votre maison ! Chaque salle du temple renferme une énigme et une lettre du mot sacré qui ouvre la chambre du pharaon.',
      finale: 'La chambre du pharaon se trouve… (écris ici où est le trésor)',
      lock: { type: 'mot', value: 'SPHINX', real: false },
    },
    [
      { title: 'La porte du temple', clue: 'L\'entrée est gardée là où l\'on accroche les clés.', hide: 'Près du porte-clés', challenge: txt('Qu\'est-ce qui a une tête et une queue, mais pas de corps ?', ['piece', 'piece de monnaie', 'monnaie'], ['On la lance pour choisir.', 'Pile ou face…', 'Une pi…'], '🪙') },
      { title: 'La salle des hiéroglyphes', clue: 'Les scribes écrivaient là où tu fais tes devoirs.', hide: 'Sur ou sous le bureau des devoirs', challenge: num('Quel nombre vient ensuite : 5, 10, 20, 40, … ?', 80, ['Chaque nombre double.', '40 + 40', '80.'], '📜') },
      { title: 'Le puits sacré', clue: 'Là où l\'eau coule dans la maison.', hide: 'Sous un lavabo', challenge: qcm('Sur quel continent se trouve l\'Égypte ?', ['En Asie', 'En Afrique', 'En Europe'], 1, ['Le Nil y coule.', 'Au sud de la Méditerranée.', 'En Afrique.'], '🏺') },
      { title: 'La chambre des momies', clue: 'Les momies sont bien emmaillotées… comme le linge propre.', hide: 'Dans l\'armoire à linge', challenge: txt('Lis à l\'envers : ROSERT', ['tresor'], ['Commence par la dernière lettre.', 'T… R… E…', 'Ce que vous cherchez !'], '🪞') },
      { title: 'Le grenier du pharaon', clue: 'Là où l\'on garde les réserves de nourriture.', hide: 'Dans le placard des réserves', challenge: num('Une pyramide a une base carrée et 4 faces triangulaires. Combien de faces a-t-elle en tout ?', 5, ['N\'oublie pas le dessous.', '4 + 1', '5 faces.'], '🔺') },
      { title: 'Le passage secret', clue: 'Le dernier passage est caché derrière un rideau.', hide: 'Derrière un rideau', challenge: adult('Marchez à l\'égyptienne, de profil, les bras en zigzag, jusqu\'à l\'adulte.', '🧍') },
    ],
  ),

  // ===================== Adultes =====================
  () => build(
    { id: 'manoir', title: 'Meurtre au manoir Delaroche', blurb: 'Une enquête pour adultes dans la maison : déduction, codes et énigmes retorses.', where: 'Maison', duration: '1 h' },
    {
      name: 'Meurtre au manoir Delaroche', theme: 'enquete', age: 'adultes', mode: 'qr',
      intro: 'Le comte Delaroche a été retrouvé endormi pour toujours dans son fauteuil. Son testament est enfermé dans un coffre-fort dont personne ne connaît le code. Rassemblez les indices, démasquez les menteurs et ouvrez le coffre avant l\'héritier.',
      finale: 'Le coffre-fort est dissimulé… (écris ici l\'emplacement du vrai coffre)',
      lock: { type: 'code', value: '0000', real: true, randomize: true },
    },
    [
      { title: 'Le bureau du comte', clue: 'Le comte rédigeait ses mémoires là où l\'encre ne sèche jamais. Fouillez son bureau.', hide: 'Dans un tiroir du bureau', challenge: txt('Décodez ce message (chaque lettre est décalée de 3 : D = A, E = B…) : FRIIUH', ['coffre'], ['F devient C.', 'R devient O.', 'C O F F…'], '🔐') },
      { title: 'La cave', clue: 'Chaque soir, il descendait choisir une bouteille.', hide: 'Près des bouteilles (cave, cellier ou casier à vin)', challenge: num('Un fermier a 17 moutons. Tous meurent sauf 9. Combien lui en reste-t-il ?', 9, ['Relisez bien la phrase.', '« Tous sauf 9 »…', 'Il en reste 9.'], '🐑') },
      { title: 'La bibliothèque', clue: 'Entre deux classiques, une page cornée vous attend.', hide: 'Glissé dans un livre de la bibliothèque', challenge: txt('Celui qui me fabrique me vend, celui qui m\'achète ne s\'en sert pas, et celui qui s\'en sert ne me voit jamais. Qui suis-je ?', ['cercueil'], ['Pensez à la toute fin.', 'Je suis en bois, chez les pompes funèbres.', 'Un cer…'], '⚰️') },
      { title: 'Le miroir', clue: 'Le majordome jure l\'avoir vu se raser à 7 h. Vérifiez le reflet.', hide: 'Collé derrière le miroir de la salle de bain', challenge: num('Des nénuphars doublent de surface chaque jour et couvrent tout l\'étang en 48 jours. En combien de jours en couvrent-ils la moitié ?', 47, ['Ce n\'est pas 24.', 'Pensez à la veille.', '47 jours.'], '🪷') },
      { title: 'La cuisine', clue: 'La cuisinière garde ses secrets au frais.', hide: 'Dans le bac à légumes du réfrigérateur', challenge: txt('Déchiffrez ce message en morse : -.-. .-.. .', ['cle', 'la cle'], ['Trois lettres.', '. = E', 'Ce qui ouvre une serrure.'], '📡') },
      { title: 'Le fauteuil', clue: 'Il s\'est endormi dans son fauteuil préféré. Regardez sous les coussins.', hide: 'Sous un coussin du canapé ou du fauteuil', challenge: qcm('Trois suspects. Le majordome : « C\'est la cuisinière. » La cuisinière : « Ce n\'est pas moi. » Le jardinier : « Ce n\'est pas moi. » Un seul dit la vérité. Qui est coupable ?', ['Le majordome', 'La cuisinière', 'Le jardinier'], 2, ['Testez chaque hypothèse.', 'Si la cuisinière dit vrai, les deux autres mentent.', 'Le jardinier.'], '🕵️') },
      { title: 'Le gardien de la porte', clue: 'Le testament évoque « celui qui garde la porte ».', hide: 'Sous le paillasson ou dans le porte-parapluie', challenge: photo('Reconstituez la scène du crime : une photo d\'équipe façon polar, avec le coupable désigné.', '📸') },
    ],
  ),

  () => build(
    { id: 'evjf-evg', title: 'La quête des témoins (EVJF / EVG)', blurb: 'Enterrement de vie de jeune fille ou de garçon en ville : défis photo, gages et quiz sur les futurs mariés.', where: 'Ville', duration: '1 h 30', setup: 'Place les 6 étapes dans ta ville et personnalise la question sur les futurs mariés (étape 3).' },
    {
      name: 'La quête des témoins', theme: 'fete', age: 'adultes', mode: 'gps', nav: 'boussole',
      intro: 'Avant de dire « oui », il faut le mériter ! Six étapes dans la ville, six défis, et à chaque fois une lettre du mot mystère. Suivez la boussole, relevez les gages… et gardez votre dignité, si possible.',
      finale: 'La surprise vous attend… (écris ici où se trouve le trésor ou le lieu de la soirée)',
      lock: { type: 'mot', value: 'MARIAGE', real: false },
    },
    [
      { title: 'Le point de rendez-vous', clue: 'Là où toute la ville se donne rendez-vous : la place principale.', validate: 'gps', radius: 30, challenge: adult('Le ou la futur(e) marié(e) fait une déclaration d\'amour solennelle… à un lampadaire. 30 secondes minimum.', '💘') },
      { title: 'La boulangerie', clue: 'Le parfum du pain chaud vous guidera.', validate: 'gps', radius: 25, challenge: photo('Photo de groupe avec une baguette en guise de bouquet de la mariée.', '🥖') },
      { title: 'Le monument', clue: 'Le monument que tout le monde connaît ici.', validate: 'gps', radius: 30, challenge: txt('À personnaliser : en quelle année les futurs mariés se sont-ils rencontrés ?', ['2015'], ['C\'était au siècle actuel.', 'Demandez à un ou une témoin.', 'Pensez à leur premier rendez-vous.'], '💑') },
      { title: 'Le jardin public', clue: 'Un coin de verdure pour reprendre son souffle.', validate: 'gps', radius: 30, challenge: adult('Toute l\'équipe danse un slow ou une valse pendant 20 secondes, en musique ou en chantant.', '💃') },
      { title: 'La terrasse', clue: 'Une terrasse où l\'on aime trinquer.', validate: 'gps', radius: 25, challenge: photo('Trouvez un passant volontaire qui donne un conseil de mariage, et photographiez-le avec le ou la futur(e) marié(e).', '🗣️') },
      { title: 'Le lieu secret', clue: 'La dernière lettre vous attend près du lieu de la soirée.', validate: 'gps', radius: 30, challenge: qcm('Aux noces d\'or, on fête combien d\'années de mariage ?', ['25 ans', '40 ans', '50 ans'], 2, ['25 ans, ce sont les noces d\'argent.', 'Un demi-siècle.', '50 ans.'], '💍') },
    ],
  ),

  () => build(
    { id: 'professeur', title: 'Le cabinet du professeur Lenoir', blurb: 'Un escape game à la maison : suites logiques, codes et anagrammes, chrono en main.', where: 'Maison', duration: '45-60 min' },
    {
      name: 'Le cabinet du professeur Lenoir', theme: 'espions', age: 'adultes', mode: 'qr',
      intro: 'Le professeur Lenoir a disparu en laissant son cabinet truffé de casse-têtes. Son invention la plus précieuse est enfermée derrière un mot de passe de six lettres. Vous avez une heure. Le chrono tourne.',
      finale: 'L\'invention du professeur est rangée… (écris ici où se trouve le trésor)',
      lock: { type: 'mot', value: 'EUREKA', real: false },
    },
    [
      { title: 'Le tableau noir', clue: 'Le professeur notait ses calculs à côté de l\'horloge.', hide: 'Près d\'une horloge ou d\'un réveil', challenge: num('Quel nombre vient ensuite : 1, 1, 2, 3, 5, 8, 13, … ?', 21, ['Additionnez les deux précédents.', '8 + 13', '21.'], '🐚') },
      { title: 'La bibliothèque', clue: 'Cherchez un livre dont le titre contient un nombre.', hide: 'Dans un livre dont le titre contient un nombre (à adapter)', challenge: num('Je suis un nombre à 3 chiffres. Mes centaines valent le double de mes unités, mes dizaines valent 0 et la somme de mes chiffres fait 9. Qui suis-je ?', 603, ['Centaines + unités = 9.', 'Les unités valent 3.', '603.'], '🧮') },
      { title: 'Le laboratoire', clue: 'Là où l\'on mélange, chauffe et goûte.', hide: 'Dans la cuisine, près des épices', challenge: num('Une batte et une balle coûtent 1,10 € en tout. La batte coûte 1 € de plus que la balle. Combien coûte la balle, en centimes ?', 5, ['Ce n\'est pas 10.', 'Balle + (balle + 100) = 110.', '5 centimes.'], '⚾') },
      { title: 'L\'atelier', clue: 'Les outils du professeur dorment dans la pièce la plus froide.', hide: 'Au garage ou au cellier', challenge: txt('Suite logique : U, D, T, Q, C, S, S… Quelle est la lettre suivante ?', ['h'], ['Comptez à voix haute.', 'Un, deux, trois…', 'Après sept, il y a…'], '🔢') },
      { title: 'Le salon', clue: 'Là où l\'on se rassemble pour les soirées télé.', hide: 'Derrière la télévision', challenge: txt('Trouvez l\'anagramme de CHIEN qui désigne l\'endroit où il dort.', ['niche'], ['Mêmes lettres, autre ordre.', 'Elle est souvent dans le jardin.', 'N…'], '🐕') },
      { title: 'La chambre', clue: 'La nuit, le professeur rêvait de son invention.', hide: 'Sous un oreiller', challenge: adult('Chaque joueur cite une invention française en moins de 20 secondes, sans répétition.', '💡') },
    ],
  ),

  () => build(
    { id: 'rallye-vacances', title: 'Le rallye des vacances', blurb: 'Pour une bande d\'amis en vacances : 6 étapes GPS autour de la location, culture générale et défis photo.', where: 'Vacances', duration: '1 h 30', setup: 'Place les 6 étapes autour de ta location, sur la carte ou en marchant.' },
    {
      name: 'Le rallye des vacances', theme: 'explorateurs', age: 'adultes', mode: 'gps', nav: 'boussole',
      intro: 'Les équipes s\'affrontent dans un rallye autour de la location. Boussole en main, trouvez chaque étape, répondez aux questions et rapportez les photos. L\'équipe la plus rapide ouvre le coffre… et choisit le menu du dîner.',
      finale: 'Le coffre du rallye se trouve… (écris ici où est le trésor)',
      lock: { type: 'code', value: '0000', real: false, randomize: true },
    },
    [
      { title: 'Le point de départ', clue: 'Commencez par l\'endroit le plus photographié du coin.', validate: 'gps', radius: 30, challenge: qcm('En quelle année l\'homme a-t-il marché sur la Lune pour la première fois ?', ['1965', '1969', '1972'], 1, ['Sous la présidence de Nixon.', 'Apollo 11.', '1969.'], '🌕') },
      { title: 'Le clocher', clue: 'L\'église ou la mairie : le cœur du village.', validate: 'gps', radius: 30, challenge: txt('Mon premier est un métal précieux. Mon second est un messager céleste. Mon tout est un fruit.', ['orange'], ['Premier : or.', 'Second : ange.', 'Or + ange…'], '🍊') },
      { title: 'Le marché', clue: 'Là où les producteurs du coin vendent leurs produits.', validate: 'gps', radius: 35, challenge: photo('Photographiez (ou achetez) le produit local le plus insolite.', '🧺') },
      { title: 'Le point d\'eau', clue: 'Rivière, fontaine, lac ou plage : suivez l\'eau.', validate: 'gps', radius: 35, challenge: qcm('Combien de cases compte un échiquier ?', ['36', '64', '100'], 1, ['8 cases de côté.', '8 × 8', '64.'], '♟️') },
      { title: 'Le panorama', clue: 'Montez là où la vue porte le plus loin.', validate: 'gps', radius: 35, challenge: photo('Toute l\'équipe saute en même temps : prenez la photo quand personne ne touche le sol.', '🦘') },
      { title: 'Le retour au camp', clue: 'Le trésor est tout près de la location.', validate: 'gps', radius: 25, challenge: num('5 machines fabriquent 5 objets en 5 minutes. Combien de minutes faut-il à 100 machines pour fabriquer 100 objets ?', 5, ['Une machine fait un objet en 5 minutes.', 'Les 100 machines travaillent en même temps.', '5 minutes.'], '🏭') },
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
