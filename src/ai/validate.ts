import type { GenerateParams } from './types';
import type { ExerciseType } from '@/types/session';
import type { CEFRLevel } from '@/types/fingerprint';

const LEVEL_MAX_WORDS: Record<CEFRLevel, number> = { A1: 8, A2: 12, B1: 18, B2: 18 }

// Raw shape the model returns (before validation)
interface RawGenerated {
  norwegian?: unknown;
  english?: unknown;
  targetWord?: unknown;
  distractors?: unknown;
  words?: unknown;
}

// Validated fields extracted from raw generation output
export interface ValidatedContent {
  norwegian: string;
  english: string;
  notes?: string;       // fill-in-blank: targetWord mapped here (matches Sentence.notes convention)
  distractors?: string[];
  words?: string[];
  scenarioId?: string;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isStringArray(v: unknown, minLen = 1): v is string[] {
  return Array.isArray(v) && v.length >= minLen && v.every(isNonEmptyString);
}

function wordCount(s: string): number {
  return s.trim().replace(/___/g, 'BLANK').split(/\s+/).length;
}

// Norwegian Bokmål character set — includes / for abbreviations and % for common
// expressions. Accented Latin letters (é in "én"/"idé"/"kafé", à, ô, ç…), the
// em-dash, guillemets «», and typographic quotes/ellipsis are all legitimate in
// Norwegian text and must pass (omitting them wrongly rejected valid sentences).
const NORWEGIAN_CHARS = /^[a-zA-ZæøåÆØÅéÉèÈêÊàÀôÔçüÜäÄöÖ0-9\s.,!?;:'"«»“”‘’…()\-–—/%]+$/;

function checkStructure(raw: RawGenerated, exerciseType: ExerciseType): string | null {
  if (!isNonEmptyString(raw.norwegian)) return 'missing or empty norwegian';
  if (!isNonEmptyString(raw.english)) return 'missing or empty english';

  switch (exerciseType) {
    case 'fill-in-blank': {
      if (!raw.norwegian.includes('___')) return 'no ___ blank marker in norwegian';
      if (!isNonEmptyString(raw.targetWord)) return 'missing targetWord';
      if (!isStringArray(raw.distractors, 3)) return 'need at least 3 distractors';
      // Case-insensitive check — "Ikke" and "ikke" are the same answer
      const targetLower = (raw.targetWord as string).toLowerCase();
      if ((raw.distractors as string[]).some((d) => d.toLowerCase() === targetLower))
        return 'distractor contains the correct answer';
      break;
    }
    case 'word-order': {
      // words array is required for word-order exercises — components need it to scramble
      if (!isStringArray(raw.words, 2))
        return 'word-order exercise must include a words array of at least 2 items';
      break;
    }
  }
  return null;
}

function checkContent(norwegian: string, exerciseType: ExerciseType, level?: CEFRLevel): string | null {
  const testStr = norwegian.replace(/___/g, '');
  if (!NORWEGIAN_CHARS.test(testStr)) return 'unexpected characters in norwegian text';

  const wc = wordCount(norwegian);
  if (exerciseType === 'speed-round' && (wc < 3 || wc > 9)) return 'speed-round sentence wrong length';
  if (exerciseType !== 'speed-round' && (wc < 4 || wc > 18)) return 'sentence length out of range';

  if (level && exerciseType !== 'speed-round') {
    const maxWords = LEVEL_MAX_WORDS[level]
    if (wc > maxWords) return 'sentence too complex for level'
  }

  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// P0.5-06 — AI language-validity gate
//
// Used by explainMistake, conversationTurn, reviewWriting (and defence-in-depth
// before updateRepairExplanation) to drop AI prose that is not coherent
// Norwegian before it reaches the learner. The third walkthrough captured
// Kari emitting "Det lunter for å ikke væreatraftet tidlig oglanda!" — a
// string with several non-words — and the repair card teaching reversed
// gender rules. Both surfaces had no validity check between the model output
// and the rendered string. This gate covers that gap with three cheap heuristics
// run on every AI surface.
// ──────────────────────────────────────────────────────────────────────────

// Telltale English function words that don't normally appear in plain Norwegian
// prose. Mid-paragraph English drift is the failure mode this catches.
const ENGLISH_DRIFT_WORDS = new Set([
  'is', 'are', 'was', 'were', 'the', 'of', 'with', 'and', 'or', 'but',
  'this', 'that', 'these', 'those', 'have', 'has', 'had', 'will',
  'should', 'would', 'could', 'because', 'about', 'between', 'through',
  'because', 'before', 'after', 'instead', 'however', 'therefore',
])

// Norwegian function words we expect to see at least one of in any
// non-trivial Norwegian sentence. If none appear, the text is suspect.
const NORWEGIAN_FUNCTION_WORDS = new Set([
  'er', 'har', 'ikke', 'jeg', 'du', 'vi', 'de', 'det', 'den', 'en', 'et',
  'og', 'eller', 'men', 'å', 'i', 'på', 'til', 'fra', 'med', 'av', 'for',
  'om', 'som', 'hva', 'hvor', 'hvem', 'når', 'hvorfor', 'kan', 'vil',
  'skal', 'må', 'meg', 'deg', 'oss', 'dem', 'min', 'din', 'sin',
  // 3rd-person pronouns + common verbs/determiners — omitting these wrongly
  // rejected valid sentences like "Han tar medisiner" / "Hun kjøper melk".
  'han', 'hun', 'ham', 'henne', 'hans', 'hennes', 'dere', 'deres', 'seg',
  'dette', 'disse', 'vår', 'var', 'blir', 'ble', 'ha', 'være',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,!?;:«»"'()/\-–%]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0)
}

export interface NorwegianValidityResult {
  valid: boolean
  reason?: 'non-norwegian-chars' | 'synthetic-compound' | 'english-drift' | 'no-norwegian-markers'
  detail?: string
}

/**
 * Validate that an AI-generated Norwegian string is actually Norwegian and
 * not gibberish, English drift, or fabricated compounds.
 *
 * Returns valid=true for normal Norwegian prose. valid=false with a reason
 * tells the caller why; the caller should fall back to its deterministic
 * template instead of displaying the AI text.
 *
 * Tuning: this is a coarse filter. False positives ought to be rare for
 * normal A1–B2 sentences; false negatives are acceptable since the gate is
 * defence-in-depth on top of the prompt design itself.
 */
export function validateNorwegianOutput(text: string, opts?: { minWords?: number }): NorwegianValidityResult {
  const trimmed = text.trim()
  if (!trimmed) return { valid: false, reason: 'no-norwegian-markers', detail: 'empty text' }

  // 1. Character set — letters/digits/Norwegian-allowed punctuation only.
  if (!NORWEGIAN_CHARS.test(trimmed)) {
    return { valid: false, reason: 'non-norwegian-chars', detail: 'unexpected characters' }
  }

  const words = tokenize(trimmed)
  const minWords = opts?.minWords ?? 3
  if (words.length < minWords) {
    // Very short fragments can't be reliably classified; pass through.
    return { valid: true }
  }

  // 2. Synthetic compound — any word longer than 18 chars after stripping
  // punctuation is almost always a fabrication for A1–B2 content.
  const tooLong = words.find((w) => w.length > 18)
  if (tooLong) {
    return { valid: false, reason: 'synthetic-compound', detail: tooLong }
  }

  // 3. English drift — if 25%+ of tokens are common English function words,
  // the model has drifted off Norwegian.
  const englishHits = words.filter((w) => ENGLISH_DRIFT_WORDS.has(w)).length
  if (englishHits / words.length > 0.25) {
    return { valid: false, reason: 'english-drift', detail: `${englishHits}/${words.length} English function words` }
  }

  // 4. Norwegian markers — every real Norwegian sentence has at least one of
  // these. Missing them suggests gibberish or pure-loanword text.
  const norwegianHits = words.filter((w) => NORWEGIAN_FUNCTION_WORDS.has(w)).length
  if (norwegianHits === 0) {
    return { valid: false, reason: 'no-norwegian-markers', detail: 'zero Norwegian function words' }
  }

  return { valid: true }
}

export function validateGenerated(
  raw: unknown,
  params: GenerateParams
): { valid: true; content: ValidatedContent } | { valid: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'response is not an object' };
  }

  const r = raw as RawGenerated;

  const structErr = checkStructure(r, params.exerciseType);
  if (structErr) return { valid: false, error: structErr };

  const norwegian = (r.norwegian as string).trim();
  const english = (r.english as string).trim();

  const contentErr = checkContent(norwegian, params.exerciseType, params.level as CEFRLevel);
  if (contentErr) return { valid: false, error: contentErr };

  const content: ValidatedContent = {
    norwegian,
    english,
    scenarioId: params.scenario,
  };

  if (params.exerciseType === 'fill-in-blank') {
    content.notes = (r.targetWord as string).trim();
    content.distractors = (r.distractors as string[]).map((d) => d.trim());
  }

  if (params.exerciseType === 'word-order' && isStringArray(r.words, 2)) {
    content.words = r.words as string[];
  }

  return { valid: true, content };
}
