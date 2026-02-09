#!/usr/bin/env node
/**
 * Génère un fichier JSON pour importer toutes les cartes de drapeaux
 * Usage: node scripts/generate-flags-deck.js > flags-deck.json
 */

const fs = require('fs');
const path = require('path');

const FLAGS_DIR = path.join(__dirname, '..', 'apps', 'worker', 'storage', 'drapeaux');
const BASE_URL = '/storage/flags';

// Conversion des noms de fichiers en noms de pays lisibles
function formatCountryName(filename) {
  const name = filename.replace('.svg', '');

  // Cas spéciaux
  const specialCases = {
    'etats_unis': 'États-Unis',
    'emirats_arabes_unis': 'Émirats Arabes Unis',
    'royaume_uni': 'Royaume-Uni',
    'cap_vert': 'Cap-Vert',
    'costa_rica': 'Costa Rica',
    'cote_d_ivoire': "Côte d'Ivoire",
    'coree_du_nord': 'Corée du Nord',
    'coree_du_sud': 'Corée du Sud',
    'republique_centrafricaine': 'République Centrafricaine',
    'republique_democratique_du_congo': 'République Démocratique du Congo',
    'republique_dominicaine': 'République Dominicaine',
    'republique_du_congo': 'République du Congo',
    'bosnie_herzegovine': 'Bosnie-Herzégovine',
    'burkina_faso': 'Burkina Faso',
    'guinee_bissau': 'Guinée-Bissau',
    'guinee_equatoriale': 'Guinée Équatoriale',
    'iles_cook': 'Îles Cook',
    'iles_marshall': 'Îles Marshall',
    'macedoine_du_nord': 'Macédoine du Nord',
    'nouvelle_zelande': 'Nouvelle-Zélande',
    'papouasie_nouvelle_guinee': 'Papouasie-Nouvelle-Guinée',
    'pays_bas': 'Pays-Bas',
    'sri_lanka': 'Sri Lanka',
    'soudan_du_sud': 'Soudan du Sud',
    'timor_oriental': 'Timor Oriental',
    'viet_nam': 'Viêt Nam',
    'etats_federes_de_micronesie': 'États Fédérés de Micronésie'
  };

  if (specialCases[name]) {
    return specialCases[name];
  }

  // Conversion générique: remplacer underscores par espaces et capitaliser
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Générer les variantes acceptables de réponses
function generateAnswers(countryName) {
  const answers = [countryName];

  // Version en minuscules
  answers.push(countryName.toLowerCase());

  // Version sans accents
  const withoutAccents = countryName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '');
  if (!answers.includes(withoutAccents)) {
    answers.push(withoutAccents);
  }

  // Version sans accents en minuscules
  const withoutAccentsLower = withoutAccents.toLowerCase();
  if (!answers.includes(withoutAccentsLower)) {
    answers.push(withoutAccentsLower);
  }

  return [...new Set(answers)]; // Dédupliquer
}

// Lire les fichiers SVG
const files = fs.readdirSync(FLAGS_DIR)
  .filter(f => f.endsWith('.svg'))
  .sort();

// Générer les cartes
const cards = files.map(filename => {
  const countryName = formatCountryName(filename);
  const imageUrl = `${BASE_URL}/${filename}`;

  return {
    question: "Quel est ce pays ?",
    answers: generateAnswers(countryName),
    imageUrl
  };
});

// Structure du deck
const deck = {
  name: "Drapeaux du Monde",
  description: `Reconnaître les drapeaux de ${cards.length} pays`,
  cards
};

// Sortir le JSON
console.log(JSON.stringify(deck, null, 2));
