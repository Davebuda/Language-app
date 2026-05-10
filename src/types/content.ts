import type { CEFRLevel } from './fingerprint';
import type { ErrorTag } from './taxonomy';
import type { ExerciseType } from './session';

export type DifficultyTier = 1 | 2 | 3; // within a CEFR level

export interface Sentence {
  id: string;
  norwegian: string;
  english: string;
  conceptIds: string[];           // grammar concepts demonstrated
  vocabularyClusters: string[];   // vocab clusters involved
  errorTagsDetectable: ErrorTag[]; // which errors can be caught using this sentence
  cefrLevel: CEFRLevel;
  difficulty: DifficultyTier;
  scenarioId?: string;
  audioUrl?: string;              // Azure Blob Storage URL
  exerciseTypes: ExerciseType[];  // which exercise types this sentence supports
  notes?: string;                 // internal authoring note
}

export interface VocabItem {
  id: string;
  norwegian: string;
  english: string;
  wordClass: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction' | 'pronoun' | 'numeral' | 'other';
  gender?: 'en' | 'ei' | 'et';   // for nouns
  cefrLevel: CEFRLevel;
  clusterId: string;
  frequency: number;              // word frequency rank (lower = more common)
  audioUrl?: string;
  exampleSentenceId?: string;
}

export interface VocabCluster {
  id: string;
  label: string;                  // e.g. "Food & Drink"
  description: string;
  cefrLevel: CEFRLevel;
  wordCount: number;
}

export interface Scenario {
  id: string;
  title: string;                  // English
  setting: string;                // e.g. "café in Oslo, mid-afternoon"
  characterRole: string;          // e.g. "barista named Kari"
  targetConceptIds: string[];
  targetVocabClusterIds: string[];
  cefrLevelMin: CEFRLevel;
  cefrLevelMax: CEFRLevel;
  openingLine?: string;           // pre-written fallback opening
}

export interface GrammarExplainer {
  id: string;
  conceptId: string;
  title: string;
  body: string;                   // Markdown
  examples: Array<{
    norwegian: string;
    english: string;
    note?: string;
  }>;
  commonMistakes: Array<{
    wrong: string;
    correct: string;
    why: string;
  }>;
}
