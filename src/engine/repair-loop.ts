import type { ErrorLogEntry } from '@/types/fingerprint';
import type { ExerciseType, SessionItem } from '@/types/session';
import { isNotYetAvailableType } from '@/types/session';
import type { ErrorTag } from '@/types/taxonomy';

// Templates for each error type — used when AI is unavailable
const EXPLANATION_TEMPLATES: Record<ErrorTag, string> = {
  'word-order':
    'In Norwegian, the verb must always be in the second position in a main clause (V2 rule). When you start a sentence with an adverb or time expression, the subject and verb switch places.',
  'verb-tense':
    'Check the tense: present tense uses -er, past tense (preterite) follows -et/-te/-de patterns depending on the verb class.',
  'verb-conjugation':
    'Norwegian verbs are the same for all persons in present tense (jeg er, du er, han er — all use "er"). No conjugation for person, but tense endings change.',
  'noun-gender':
    'Norwegian has three genders: en (common), ei (feminine), et (neuter). The gender determines which article and adjective forms to use.',
  'article-use':
    'The definite article in Norwegian is a suffix: -en (en-words), -a or -en (ei-words), -et (et-words). The indefinite article en/ei/et comes before the noun.',
  'adjective-agreement':
    "Adjectives must agree with the noun's gender and definiteness. Indefinite: stor (en), stor (ei), stort (et). Definite: all become store.",
  'pronoun-choice':
    'Check your pronoun: jeg/I, du/you, han/he, hun/she, det or den/it, vi/we, dere/you all, de/they.',
  'preposition':
    'Norwegian prepositions don\'t always match English. "I" means in/at for places, "på" for surfaces and some places, "til" for direction.',
  'modal-verb':
    'Modal verbs (kan, vil, skal, må) are followed by the infinitive without "å". Example: jeg kan snakke (not jeg kan å snakke).',
  'negation-placement':
    'In main clauses, "ikke" comes after the verb: "jeg snakker ikke." In subordinate clauses, "ikke" comes before the verb: "at jeg ikke snakker."',
  'compound-word':
    'Norwegian commonly combines words into compounds written as one word. The main meaning comes from the last part, modified by the first: "kjøkkenbenk" (kitchen + bench = kitchen counter).',
  'wrong-word-same-category':
    "Close, but not the right word here. Check if it's a false friend (looks like English but means something different) or a near-synonym with a slightly different use.",
  'wrong-word-different-category':
    "This word doesn't fit the meaning needed here. Try to recall words from this topic cluster.",
  spelling:
    'Check the spelling carefully. Norwegian has some tricky patterns — especially double consonants and the letters æ, ø, å.',
  'listening-recognition':
    'This one is about what you heard. Try the audio again at a slower speed and focus on individual sounds. Norwegian rhythm differs from English.',
  'reading-parsing':
    'Break the sentence into parts: find the verb first (V2 rule), then the subject, then the rest.',
  'meaning-misunderstood':
    'You recognized the words but the meaning didn\'t quite land. Focus on the key verb and any prepositions — they carry a lot of the meaning in Norwegian.',
  unspecified:
    'Review this concept and try again. Pay attention to the specific rule being tested.',
};

// Which exercise types work best for remediating each error tag
const REMEDIATION_EXERCISE_MAP: Partial<Record<ErrorTag, ExerciseType[]>> = {
  'word-order': ['word-order', 'sentence-transformation', 'translation-to-norwegian'],
  'verb-tense': ['fill-in-blank', 'sentence-transformation', 'translation-to-norwegian'],
  'verb-conjugation': ['fill-in-blank', 'translation-to-norwegian'],
  'noun-gender': ['fill-in-blank', 'speed-round'],
  'article-use': ['fill-in-blank', 'sentence-transformation'],
  'adjective-agreement': ['fill-in-blank', 'sentence-transformation'],
  'pronoun-choice': ['fill-in-blank', 'sentence-transformation'],
  preposition: ['fill-in-blank', 'translation-to-norwegian'],
  'modal-verb': ['fill-in-blank', 'translation-to-norwegian'],
  'negation-placement': ['sentence-transformation', 'fill-in-blank', 'word-order'],
  'listening-recognition': ['listening-comprehension', 'dictation'],
  'reading-parsing': ['translation-to-english', 'translation-to-norwegian'],
};

export interface RepairPlan {
  explanation: string;
  microDrillExerciseTypes: ExerciseType[];
  retryExerciseType: ExerciseType;
  reviewIntervalDays: number;
}

export function buildRepairPlan(error: ErrorLogEntry): RepairPlan {
  const explanation =
    EXPLANATION_TEMPLATES[error.errorTag] ??
    'Review this concept and try again. Pay attention to the specific rule being tested.';

  // Exclude phantom (not-yet-available) types — `sentence-transformation`, `dictation` —
  // so a repair micro-drill never renders the honest "kommer snart / skip" banner instead
  // of actually remediating the error (defeats the moat's remediation pillar; observed live
  // 2026-06-05). The scheduler already filters these; the repair loop must agree. Fall back
  // to a guaranteed-real drill set if filtering empties the list.
  const REAL_FALLBACK: ExerciseType[] = ['fill-in-blank', 'translation-to-norwegian'];
  const mapped = (REMEDIATION_EXERCISE_MAP[error.errorTag] ?? REAL_FALLBACK).filter(
    (t) => !isNotYetAvailableType(t)
  );
  const microDrillTypes: ExerciseType[] = mapped.length > 0 ? mapped : REAL_FALLBACK;

  // Retry uses the same exercise type as the original — its job is verification,
  // not generalisation. Varied practice belongs in the micro-drills, not here.
  // Guard against a phantom original type slipping through to the retry.
  const retryType: ExerciseType = isNotYetAvailableType(error.exerciseType)
    ? 'translation-to-norwegian'
    : error.exerciseType;

  // Spaced repetition intervals: 1d → 3d → 7d → 14d → 30d
  const reviewIntervalDays = 1;

  return {
    explanation,
    microDrillExerciseTypes: microDrillTypes.slice(0, 2),
    retryExerciseType: retryType,
    reviewIntervalDays,
  };
}

export function makeRepairItems(
  error: ErrorLogEntry,
  plan: RepairPlan,
  availableSentenceIds: string[]
): SessionItem[] {
  const items: SessionItem[] = [];

  const getSentence = () =>
    availableSentenceIds[Math.floor(Math.random() * availableSentenceIds.length)] ??
    error.sentenceId ??
    'unknown';

  // Step: micro-drills (2 items)
  for (const exerciseType of plan.microDrillExerciseTypes) {
    items.push({
      id: crypto.randomUUID(),
      exerciseType,
      contentId: getSentence(),
      conceptIds: [error.conceptId],
      estimatedSeconds: 40,
      isRepairItem: true,
      repairContext: {
        triggeredBy: error,
        step: 'micro-drill',
        explanationText: plan.explanation,
        microDrillConceptId: error.conceptId,
      },
      purpose: 'remediation',
      selectionReason: 'repair_target',
    });
  }

  // Step: retry (original sentence, slightly different exercise)
  items.push({
    id: crypto.randomUUID(),
    exerciseType: plan.retryExerciseType,
    contentId: error.sentenceId ?? getSentence(),
    conceptIds: [error.conceptId],
    estimatedSeconds: 45,
    isRepairItem: true,
    repairContext: {
      triggeredBy: error,
      step: 'retry',
    },
    purpose: 'remediation',
    selectionReason: 'repair_target',
  });

  return items;
}
