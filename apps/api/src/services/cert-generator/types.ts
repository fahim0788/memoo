/**
 * Certification Generator Types
 */

export interface CertificationBlueprint {
  code: string;
  title: string;
  description: string;
  topics: Topic[];
  source: string;
  lastUpdated: string;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-100, importance %
  subtopics: string[];
}

export interface GeneratedCard {
  question: string;
  answers: string[]; // Multiple choice options
  correctAnswer: string;
  distractors: string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  source: string;
}

export interface GeneratedChapter {
  name: string;
  description?: string;
  cards: GeneratedCard[];
  topicId: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  plagiarismScore?: number; // 0.0 - 1.0
  flagged: boolean;
}

export interface GenerationConfig {
  blueprintCode: string;
  targetCardCount?: number; // Default 150
  includeExplanations?: boolean; // Default true
  difficulty?: 'mixed' | 'easy' | 'medium' | 'hard'; // Default mixed
}

export interface GenerationResult {
  success: boolean;
  deckId?: string;
  chapters?: GeneratedChapter[];
  cardCount?: number;
  error?: string;
  validationErrors?: string[];
}
