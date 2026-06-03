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
  // word-order: optional author-supplied alternative orderings that are also
  // grammatically valid (e.g. legal V2 fronting variants). When present, the
  // word-order grader accepts the canonical order OR any of these. When absent,
  // only the canonical `norwegian` order passes — so existing content is never
  // affected. Conservative + opt-in by design.
  acceptedOrders?: string[];
  // translation: optional author-supplied alternative correct answers (valid
  // paraphrases / synonyms) for translation exercises. When present, the grader
  // accepts the canonical answer OR any of these (each compared with the same
  // formatting + contraction tolerance). When absent, only the canonical answer
  // passes — existing content is never affected. Linguist-gated, opt-in by design.
  // (Parallel to ClozeSegment gap.acceptedAnswers.)
  acceptedAnswers?: string[];
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

// ResolvedContent is what exercise components always receive.
// Source is either a pre-seeded sentence or AI-generated content.
// All fields from Sentence are present; extras are optional and only
// populated for generated content.
export interface ResolvedContent extends Sentence {
  source: 'seed' | 'generated';
  distractors?: string[]; // fill-in-blank: 3 plausible wrong options from AI
  // True when all seeds for a non-review item are already passed, so this
  // sentence is shown as a disclosed repetition rather than as new material.
  // The UI surfaces a "Repetisjon" badge — never silently recycles passed content.
  isReviewFallback?: boolean;
}

export type ClozeSegment =
  | { kind: 'text'; value: string }
  | {
      kind: 'gap';
      answer: string;            // correct word/phrase the learner types
      acceptedAnswers?: string[]; // optional equivalents
      conceptId: string;         // concept THIS gap targets
      errorTag: ErrorTag;        // tag logged on a wrong answer for this gap
    };

export interface ClozePassage {
  id: string;
  cefrLevel: CEFRLevel;
  primaryConceptId: string;      // drives scheduling/selectionReason
  englishGloss: string;          // full-passage hint (shown small/muted)
  segments: ClozeSegment[];
  difficulty: DifficultyTier;
  title?: string;
}

// What the cloze component receives (parallel to ResolvedContent for sentences).
export interface ResolvedClozePassage extends ClozePassage {
  source: 'seed' | 'generated';
}

// One artifact powering the read → recite → write flow (the "skriv" module).
// The learner READS it, RECITES bounded key sentences aloud, then WRITES an
// opinion. See output/unified-read-recite-write-design.md.
export interface ReadingPassage {
  id: string;
  cefrLevel: CEFRLevel;
  title?: string;
  primaryConceptId: string;        // drives scheduling/selectionReason
  conceptIds: string[];            // all concepts the passage exposes (READ → recordExposure)
  difficulty: DifficultyTier;

  // READ
  paragraphs: string[];            // passage body, one entry per paragraph
  englishGloss?: string;           // optional muted, opt-in translation

  // RECITE — bounded to the highest-value sentence(s), level-scaled, never the
  // whole passage (reciting a long text is recognition, not production).
  sentences: string[];             // flat list of speakable sentences
  reciteTargetIndices: number[];   // indices into `sentences` that form the recite scope

  // WRITE
  writePrompt: string;             // the opinion prompt shown on the WRITE page
  writeFrame?: string;             // optional scaffold (A1/A2); presence ⇒ guided ⇒ reduced-weight brick
  targetConnectors: string[];      // structure markers the WRITE step targets (e.g. ['fordi','selv om'])
  targetStructureTag: ErrorTag;    // tag logged by the grader when the target structure is absent
  passageContentWords: string[];   // curated content words (lowercased) for on-topic overlap
}

// What the read-respond component receives (parallel to ResolvedClozePassage).
export interface ResolvedReadingPassage extends ReadingPassage {
  source: 'seed' | 'generated';
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
