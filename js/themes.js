// Les univers : couleurs, vocabulaire et décor. Chaque chasse en choisit un.

export const THEMES = {
  pirates: {
    id: 'pirates', name: 'Pirates', emoji: '🏴‍☠️', mascot: '🦜',
    colors: { bg: '#7fd3f0', bg2: '#4fb6dc', accent: '#ffc43d', accent2: '#ff6f59', ink: '#1d2b53', card: '#fffdf6', onAccent: '#1d2b53' },
    deco: ['🌊', '⚓', '🐚', '🦀', '🗺️'],
    words: {
      players: 'moussaillons', team: 'Équipage', step: 'Escale', treasure: 'le trésor du capitaine', chest: 'le coffre',
      start: 'Larguez les amarres !', found: 'Mille sabords, trouvé !', wrong: 'Presque, matelot ! Essaie encore.',
      hint: 'Message du perroquet', finish: 'Le coffre est à vous, moussaillons !', diploma: 'Diplôme de Grand Pirate',
      reward: 'Pièce de la carte',
    },
    pin: '🏝️',
  },
  espions: {
    id: 'espions', name: 'Agents secrets', emoji: '🕵️', mascot: '🕶️',
    colors: { bg: '#2b2d42', bg2: '#1f2133', accent: '#4cc9f0', accent2: '#ef233c', ink: '#edf2f4', card: '#3a3d5c', onAccent: '#14162a', line: '#0d0e1a', shadow: '#0d0e1a' },
    deco: ['🔍', '🗝️', '📁', '🛰️', '🔦'],
    words: {
      players: 'agents', team: 'Brigade', step: 'Mission', treasure: 'le dossier top secret', chest: 'la mallette',
      start: 'Mission acceptée. Bonne chance, agents.', found: 'Cible localisée !', wrong: 'Code incorrect. Réessayez, agent.',
      hint: 'Message du QG', finish: 'Mission accomplie, agents !', diploma: 'Certificat d\'Agent Spécial',
      reward: 'Fragment de code',
    },
    pin: '📡',
  },
  dinos: {
    id: 'dinos', name: 'Dinosaures', emoji: '🦖', mascot: '🥚',
    colors: { bg: '#b8e08e', bg2: '#8fca5d', accent: '#ff8c42', accent2: '#7b4b2a', ink: '#2d2a1f', card: '#fffbea', onAccent: '#2d2a1f' },
    deco: ['🌿', '🦕', '🌋', '🦴', '🍃'],
    words: {
      players: 'paléontologues', team: 'Expédition', step: 'Empreinte', treasure: 'l\'œuf du T-Rex', chest: 'le nid',
      start: 'En route pour le Jurassique !', found: 'Grrr-andiose, trouvé !', wrong: 'Pas tout à fait… Le T-Rex attend !',
      hint: 'Le petit diplodocus chuchote', finish: 'Vous avez retrouvé l\'œuf !', diploma: 'Diplôme de Super Paléontologue',
      reward: 'Os de dinosaure',
    },
    pin: '🦴',
  },
  licornes: {
    id: 'licornes', name: 'Licornes', emoji: '🦄', mascot: '🌈',
    colors: { bg: '#f7c8ee', bg2: '#e6a7ff', accent: '#8a5cff', accent2: '#3fd3d9', ink: '#3b1f5c', card: '#fff7fd', onAccent: '#ffffff' },
    deco: ['✨', '🌸', '⭐', '🫧', '💖'],
    words: {
      players: 'gardiens des licornes', team: 'Troupe', step: 'Étoile', treasure: 'la corne de lumière', chest: 'le coffret magique',
      start: 'Que la magie commence !', found: 'Magique, trouvé !', wrong: 'Oups ! La magie n\'a pas marché, réessaie.',
      hint: 'Une fée te souffle', finish: 'La magie est revenue grâce à vous !', diploma: 'Diplôme de Gardien des Licornes',
      reward: 'Paillette magique',
    },
    pin: '⭐',
  },
  explorateurs: {
    id: 'explorateurs', name: 'Explorateurs', emoji: '🧭', mascot: '🐒',
    colors: { bg: '#f2d492', bg2: '#e6bb5f', accent: '#2f9c95', accent2: '#e76f51', ink: '#2b2118', card: '#fffaf0', onAccent: '#ffffff' },
    deco: ['🌴', '🐍', '🏺', '🦜', '🗿'],
    words: {
      players: 'aventuriers', team: 'Expédition', step: 'Étape', treasure: 'l\'idole d\'or', chest: 'le coffre du temple',
      start: 'L\'aventure commence !', found: 'Incroyable, trouvé !', wrong: 'Ce n\'est pas ça… Le temple garde son secret.',
      hint: 'Le vieux carnet dit', finish: 'L\'idole d\'or est à vous !', diploma: 'Diplôme de Grand Explorateur',
      reward: 'Morceau de parchemin',
    },
    pin: '🗿',
  },
};

export const THEME_LIST = Object.values(THEMES);
export const theme = id => THEMES[id] || THEMES.pirates;

// Couleurs de la page d'accueil et de l'éditeur
const BASE = { bg: '#9fe0f2', bg2: '#6cc8e6', accent: '#ffc43d', accent2: '#ff6f59', ink: '#1d2b53', card: '#ffffff', onAccent: '#1d2b53' };

export function applyTheme(id) {
  const c = id ? theme(id).colors : BASE;
  const r = document.documentElement.style;
  r.setProperty('--bg', c.bg);
  r.setProperty('--bg2', c.bg2);
  r.setProperty('--accent', c.accent);
  r.setProperty('--accent2', c.accent2);
  r.setProperty('--ink', c.ink);
  r.setProperty('--card', c.card);
  r.setProperty('--on-accent', c.onAccent);
  r.setProperty('--line', c.line || c.ink);
  r.setProperty('--shadow', c.shadow || c.ink);
  document.documentElement.dataset.theme = id || 'base';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', c.bg);
}

export const TEAM_COLORS = [
  { name: 'Rouge', color: '#ff5d5d', emoji: '🔴' },
  { name: 'Bleue', color: '#4d8dff', emoji: '🔵' },
  { name: 'Verte', color: '#3dbe7a', emoji: '🟢' },
  { name: 'Jaune', color: '#ffc43d', emoji: '🟡' },
];
