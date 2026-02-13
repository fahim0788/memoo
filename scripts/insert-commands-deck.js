#!/usr/bin/env node
/**
 * Insère le deck de commandes DevOps directement dans la DB PostgreSQL
 * Usage: node scripts/insert-commands-deck.js
 *
 * Prérequis: DB Docker doit être lancée (docker-compose up -d db)
 */

// Charger le .env depuis packages/db
require('dotenv').config({ path: require('path').join(__dirname, '..', 'packages', 'db', '.env') });

const { prisma } = require('@memolist/db');
const fs = require('fs');
const path = require('path');

async function insertCommandsDeck() {
  try {
    // Charger le deck depuis le JSON
    const deckPath = path.join(__dirname, 'commands-deck.json');
    const deck = JSON.parse(fs.readFileSync(deckPath, 'utf-8'));

    console.log(`📦 Insertion du deck: ${deck.name}`);
    console.log(`📊 ${deck.cards.length} cartes à insérer`);
    console.log('');

    // Créer le deck avec toutes les cartes en une transaction
    const result = await prisma.deck.create({
      data: {
        name: deck.name,
        ownerId: null, // Deck public
        cards: {
          create: deck.cards.map(card => ({
            question: card.question,
            answers: card.answers
          }))
        }
      },
      include: {
        _count: {
          select: { cards: true }
        }
      }
    });

    console.log('✅ Deck créé avec succès !');
    console.log(`📌 ID: ${result.id}`);
    console.log(`📝 Nom: ${result.name}`);
    console.log(`🎴 Cartes: ${result._count.cards}`);
    console.log('');
    console.log(`🔗 URL: http://localhost:3000/#/edit/${result.id}`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion:', error.message);
    if (error.code) {
      console.error(`Code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

insertCommandsDeck();
