import type { GenerateParams } from './types';
import type { ExerciseType } from '@/types/session';

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

// Norwegian Bokmål character set: letters (including æøå), digits, spaces, punctuation
const NORWEGIAN_CHARS = /^[a-zA-ZæøåÆØÅ0-9\s.,!?;:'"()\-–]+$/;

function checkStructure(raw: RawGenerated, exerciseType: ExerciseType): string | null {
  if (!isNonEmptyString(raw.norwegian)) return 'missing or empty norwegian';
  if (!isNonEmptyString(raw.english)) return 'missing or empty english';

  switch (exerciseType) {
    case 'fill-in-blank': {
      if (!raw.norwegian.includes('___')) return 'no ___ blank marker in norwegian';
      if (!isNonEmptyString(raw.targetWord)) return 'missing targetWord';
      if (!isStringArray(raw.distractors, 2)) return 'need at least 2 distractors';
      if ((raw.distractors as string[]).includes(raw.targetWord as string))
        return 'distractor contains the correct answer';
      break;
    }
    case 'word-order': {
      if (raw.words !== undefined && !isStringArray(raw.words, 2))
        return 'words array is present but invalid';
      break;
    }
  }
  return null;
}

function checkContent(norwegian: string, exerciseType: ExerciseType): string | null {
  const testStr = norwegian.replace(/___/g, '');
  if (!NORWEGIAN_CHARS.test(testStr)) return 'unexpected characters in norwegian text';

  const wc = wordCount(norwegian);
  if (exerciseType === 'speed-round' && (wc < 3 || wc > 9)) return 'speed-round sentence wrong length';
  if (exerciseType !== 'speed-round' && (wc < 4 || wc > 18)) return 'sentence length out of range';

  return null;
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

  const contentErr = checkContent(norwegian, params.exerciseType);
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
