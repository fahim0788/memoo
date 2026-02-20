import { CertificationFetcher } from './fetcher';
import { CertificationGenerator } from './generator';
import { CertificationValidator } from './validators';
import { CertificationFormatter } from './formatter';
import { GenerationConfig, GenerationResult } from './types';
import { PrismaClient } from '@memolist/db';

const prisma = new PrismaClient();

export class CertificationOrchestrator {
  private fetcher: CertificationFetcher;
  private generator: CertificationGenerator;
  private validator: CertificationValidator;
  private formatter: CertificationFormatter;

  constructor() {
    this.fetcher = new CertificationFetcher();
    this.generator = new CertificationGenerator();
    this.validator = new CertificationValidator();
    this.formatter = new CertificationFormatter();
  }

  async generateCertificationDeck(
    config: GenerationConfig,
    requestId: string
  ): Promise<GenerationResult> {
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      try {
        // Step 1: Fetch blueprint
        console.log(`[${requestId}] Fetching blueprint for ${config.blueprintCode}...`);
        const blueprint = await this.fetcher.fetchBlueprint(config.blueprintCode);

        // Step 2: Generate cards
        console.log(`[${requestId}] Generating cards...`);
        const generatedChapters = await this.generator.generateChapters(
          blueprint,
          config
        );

        // Step 3: Validate (3-tier)
        console.log(`[${requestId}] Running validations...`);
        const validationResult = await this.validator.validate(
          generatedChapters,
          config.blueprintCode
        );

        if (!validationResult.valid) {
          if (retries < maxRetries - 1) {
            console.log(`[${requestId}] Validation failed, retrying... (${retries + 1}/${maxRetries})`);
            retries++;
            continue;
          } else {
            return {
              success: false,
              error: 'Validation failed after maximum retries',
              validationErrors: validationResult.errors,
            };
          }
        }

        if (validationResult.flagged) {
          // Mark as under review
          await prisma.certificationRequest.update({
            where: { id: requestId },
            data: {
              status: 'under_review',
              metadata: {
                plagiarismScore: validationResult.plagiarismScore,
                flagReason: 'Semantic similarity detected',
              },
            },
          });

          return {
            success: false,
            error: 'Content flagged for manual review',
          };
        }

        // Step 4: Format and create Deck
        console.log(`[${requestId}] Creating Deck structure...`);
        const deckId = await this.formatter.createDeck(
          generatedChapters,
          config,
          requestId
        );

        // Step 5: Update request status
        await prisma.certificationRequest.update({
          where: { id: requestId },
          data: {
            status: 'success',
            deckId,
            metadata: {
              completedAt: new Date().toISOString(),
              cardCount: generatedChapters.reduce((sum, ch) => sum + ch.cards.length, 0),
            },
          },
        });

        return {
          success: true,
          deckId,
          chapters: generatedChapters,
          cardCount: generatedChapters.reduce((sum, ch) => sum + ch.cards.length, 0),
        };
      } catch (error) {
        console.error(`[${requestId}] Generation error:`, error);

        if (retries < maxRetries - 1) {
          console.log(`[${requestId}] Retrying... (${retries + 1}/${maxRetries})`);
          retries++;
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          await prisma.certificationRequest.update({
            where: { id: requestId },
            data: {
              status: 'failed',
              errorLog: errorMessage,
            },
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      }
    }

    return {
      success: false,
      error: 'Generation failed after maximum retries',
    };
  }
}

export { CertificationFetcher } from './fetcher';
export { CertificationGenerator } from './generator';
export { CertificationValidator } from './validators';
export { CertificationFormatter } from './formatter';
export type { GenerationConfig, GenerationResult } from './types';
