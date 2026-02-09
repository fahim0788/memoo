#!/usr/bin/env node
/**
 * Import le deck de drapeaux dans l'application MemoList
 * Usage: node scripts/import-flags-deck.js <API_URL> <AUTH_TOKEN>
 *
 * Exemples:
 *   Production: node scripts/import-flags-deck.js https://memoo.fr eyJhbG...
 *   Local: node scripts/import-flags-deck.js http://localhost:3001 eyJhbG...
 */

const fs = require('fs');
const path = require('path');

const API_BASE = process.argv[2] || 'http://localhost:3001';
const AUTH_TOKEN = process.argv[3];

if (!AUTH_TOKEN) {
  console.error('❌ Erreur: Token d\'authentification requis');
  console.error('Usage: node scripts/import-flags-deck.js <API_URL> <AUTH_TOKEN>');
  console.error('');
  console.error('Pour obtenir un token:');
  console.error('  1. Connectez-vous à l\'application');
  console.error('  2. Ouvrez la console développeur (F12)');
  console.error('  3. Tapez: localStorage.getItem("token")');
  process.exit(1);
}

async function importDeck() {
  // Charger le deck
  const deckPath = path.join(__dirname, 'flags-deck.json');
  const deck = JSON.parse(fs.readFileSync(deckPath, 'utf-8'));

  console.log(`📦 Import du deck: ${deck.name}`);
  console.log(`📊 ${deck.cards.length} cartes à importer`);
  console.log(`🌐 API: ${API_BASE}`);
  console.log('');

  try {
    // Créer le deck via l'API
    const response = await fetch(`${API_BASE}/api/my-decks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({
        name: deck.name,
        description: deck.description,
        cards: deck.cards
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log('✅ Deck créé avec succès !');
    console.log(`📌 ID: ${result.id}`);
    console.log(`📝 Nom: ${result.name}`);
    console.log(`🎴 Cartes: ${result._count?.cards || deck.cards.length}`);
    console.log('');
    console.log(`🔗 Lien: ${API_BASE.replace(/:\d+$/, '')}/#/edit/${result.id}`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error.message);
    process.exit(1);
  }
}

importDeck();
