import { GeneratedChapter, ValidationResult } from './types';

/**
 * 3-tier validation system:
 * 1. JSON Schema validation
 * 2. Pedagogical coherence (answers + distractors make sense)
 * 3. Anti-plagiat checks (Level 1: string matching)
 */
export class CertificationValidator {
  async validate(
    chapters: GeneratedChapter[],
    certCode: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let plagiarismScore = 0;

    // Tier 1: JSON Schema validation
    for (const chapter of chapters) {
      for (const card of chapter.cards) {
        const schemaError = this.validateCardSchema(card);
        if (schemaError) {
          errors.push(`Chapter "${chapter.name}": ${schemaError}`);
        }
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        errors,
        warnings,
      };
    }

    // Tier 2: Pedagogical coherence
    for (const chapter of chapters) {
      for (const card of chapter.cards) {
        const pedagogyError = this.validatePedagogy(card);
        if (pedagogyError) {
          errors.push(`Card "${card.question}": ${pedagogyError}`);
        }
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        errors,
        warnings,
      };
    }

    // Tier 3: Anti-plagiat (Level 1: String matching)
    const plagiarismResult = await this.checkAntiPlagiarism(chapters, certCode);
    if (plagiarismResult.flagged) {
      plagiarismScore = plagiarismResult.score;
    }

    return {
      valid: true,
      errors: [],
      warnings,
      plagiarismScore,
      flagged: plagiarismResult.flagged,
    };
  }

  private validateCardSchema(card: any): string | null {
    // Check required fields
    if (!card.question || typeof card.question !== 'string') {
      return 'Missing or invalid question field';
    }
    if (!card.answers || !Array.isArray(card.answers) || card.answers.length < 2) {
      return 'Must have at least 2 answer options';
    }
    if (!card.correctAnswer || typeof card.correctAnswer !== 'string') {
      return 'Missing or invalid correctAnswer field';
    }
    if (!card.distractors || !Array.isArray(card.distractors)) {
      return 'Missing or invalid distractors field';
    }

    // Check that correctAnswer is in answers
    if (!card.answers.includes(card.correctAnswer)) {
      return 'correctAnswer must be one of the answer options';
    }

    return null;
  }

  private validatePedagogy(card: any): string | null {
    // Check that distractors are plausible but incorrect
    if (card.distractors.length === 0) {
      return 'Distractors should not be empty';
    }

    // Check for duplicate answers
    const uniqueAnswers = new Set(card.answers);
    if (uniqueAnswers.size !== card.answers.length) {
      return 'Answer options contain duplicates';
    }

    // Check question clarity
    if (card.question.length < 10) {
      return 'Question is too short to be clear';
    }
    if (card.question.length > 500) {
      return 'Question is too long';
    }

    return null;
  }

  private async checkAntiPlagiarism(
    chapters: GeneratedChapter[],
    certCode: string
  ): Promise<{ flagged: boolean; score: number }> {
    // TODO: Implement Level 1 string matching
    // 1. Fetch banned questions database for this certification
    // 2. For each generated question, calculate Levenshtein distance
    // 3. If similarity > 0.85, flag as plagiarized
    // 4. Return average plagiarism score

    console.log(`[TODO] Anti-plagiat check for ${certCode}`);
    return {
      flagged: false,
      score: 0.0,
    };
  }
}
