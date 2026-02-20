import { GeneratedChapter, GenerationConfig } from './types';
import { PrismaClient } from '@memolist/db';

/**
 * Formats generated content into Deck → Chapters → Cards structure
 * Handles database insertion with transaction support
 */
export class CertificationFormatter {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createDeck(
    chapters: GeneratedChapter[],
    config: GenerationConfig,
    requestId: string
  ): Promise<string> {
    try {
      // Create deck within transaction for atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // Create Deck
        const deck = await tx.deck.create({
          data: {
            name: `${config.blueprintCode}: Study Guide`,
            aiVerify: true,
            certificationRequestId: requestId,
            allowedModes: JSON.stringify(['multiple-choice', 'flashcard']),
          },
        });

        // Create Chapters
        let position = 0;
        for (const generatedChapter of chapters) {
          const chapter = await tx.chapter.create({
            data: {
              deckId: deck.id,
              name: generatedChapter.name,
              description: generatedChapter.description || '',
              position: position++,
            },
          });

          // Create Cards for this chapter
          for (const generatedCard of generatedChapter.cards) {
            await tx.card.create({
              data: {
                deckId: deck.id,
                chapterId: chapter.id,
                question: generatedCard.question,
                answers: JSON.stringify(generatedCard.answers),
                distractors: JSON.stringify(generatedCard.distractors),
                allowedModes: JSON.stringify(['multiple-choice']),
                aiVerify: true,
              },
            });
          }
        }

        return deck.id;
      });

      return result;
    } catch (error) {
      console.error('Failed to create deck:', error);
      throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  async validateFormat(chapters: GeneratedChapter[]): Promise<boolean> {
    // Check that chapters and cards can be properly serialized to JSON
    try {
      for (const chapter of chapters) {
        JSON.stringify({
          name: chapter.name,
          description: chapter.description,
        });

        for (const card of chapter.cards) {
          JSON.stringify({
            question: card.question,
            answers: card.answers,
            distractors: card.distractors,
          });
        }
      }
      return true;
    } catch (error) {
      console.error('Format validation failed:', error);
      return false;
    }
  }
}
