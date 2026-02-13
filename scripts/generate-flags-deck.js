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

  // Cas spéciaux : noms composés, tirets, accents
  const specialCases = {
    // Noms composés avec tirets/prépositions
    'afrique_du_sud': 'Afrique du Sud',
    'antigua_et_barbuda': 'Antigua-et-Barbuda',
    'arabie_saoudite': 'Arabie Saoudite',
    'bosnie_herzegovine': 'Bosnie-Herzégovine',
    'burkina_faso': 'Burkina Faso',
    'cap_vert': 'Cap-Vert',
    'coree_du_nord': 'Corée du Nord',
    'coree_du_sud': 'Corée du Sud',
    'costa_rica': 'Costa Rica',
    'cote_d_ivoire': "Côte d'Ivoire",
    'emirats_arabes_unis': 'Émirats Arabes Unis',
    'etats_federes_de_micronesie': 'États Fédérés de Micronésie',
    'etats_unis': 'États-Unis',
    'guinee_bissau': 'Guinée-Bissau',
    'guinee_equatoriale': 'Guinée Équatoriale',
    'iles_cook': 'Îles Cook',
    'iles_marshall': 'Îles Marshall',
    'macedoine_du_nord': 'Macédoine du Nord',
    'nouvelle_zelande': 'Nouvelle-Zélande',
    'papouasie_nouvelle_guinee': 'Papouasie-Nouvelle-Guinée',
    'pays_bas': 'Pays-Bas',
    'republique_centrafricaine': 'République Centrafricaine',
    'republique_democratique_du_congo': 'République Démocratique du Congo',
    'republique_dominicaine': 'République Dominicaine',
    'republique_du_congo': 'République du Congo',
    'royaume_uni': 'Royaume-Uni',
    'saint_kitts_et_nevis': 'Saint-Kitts-et-Nevis',
    'saint_marin': 'Saint-Marin',
    'saint_vincent_et_les_grenadines': 'Saint-Vincent-et-les-Grenadines',
    'sainte_lucie': 'Sainte-Lucie',
    'sao_tome_et_principe': 'São Tomé-et-Príncipe',
    'sierra_leone': 'Sierra Leone',
    'soudan_du_sud': 'Soudan du Sud',
    'sri_lanka': 'Sri Lanka',
    'timor_oriental': 'Timor Oriental',
    'trinite_et_tobago': 'Trinité-et-Tobago',
    'viet_nam': 'Viêt Nam',
    // Accents sur première lettre (non gérés par la conversion générique)
    'egypte': 'Égypte',
    'equateur': 'Équateur',
    'erythree': 'Érythrée',
    'ethiopie': 'Éthiopie',
    // Accents internes
    'algerie': 'Algérie',
    'armenie': 'Arménie',
    'azerbaidjan': 'Azerbaïdjan',
    'bahrein': 'Bahreïn',
    'benin': 'Bénin',
    'bielorussie': 'Biélorussie',
    'bresil': 'Brésil',
    'georgie': 'Géorgie',
    'grece': 'Grèce',
    'guinee': 'Guinée',
    'haiti': 'Haïti',
    'indonesie': 'Indonésie',
    'israel': 'Israël',
    'jamaique': 'Jamaïque',
    'koweit': 'Koweït',
    'liberia': 'Libéria',
    'montenegro': 'Monténégro',
    'nepal': 'Népal',
    'nigeria': 'Nigéria',
    'norvege': 'Norvège',
    'ouzbekistan': 'Ouzbékistan',
    'perou': 'Pérou',
    'senegal': 'Sénégal',
    'slovenie': 'Slovénie',
    'suede': 'Suède',
    'tchequie': 'Tchéquie',
    'thailande': 'Thaïlande',
    'turkmenistan': 'Turkménistan',
    'yemen': 'Yémen',
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
