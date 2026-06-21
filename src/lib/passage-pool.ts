// Client-safe passage pool — A1+A2+B1 cloze passages statically imported
// from JSON so client-side schedulers can access passage data without
// server-only fs access.
//
// Mirrors the pattern of src/lib/seed-pool.ts for sentence data.

import a1Raw from '@content/passages/a1.json';
import a2Raw from '@content/passages/a2.json';
import b1Raw from '@content/passages/b1.json';
import type { ClozePassage, ClozeSegment } from '@/types/content';
import type { ErrorTag } from '@/types/taxonomy';

interface RawSegment {
  kind: 'text' | 'gap';
  value?: string;
  answer?: string;
  accepted_answers?: string[];
  concept_id?: string;
  error_tag?: string;
}

interface RawPassage {
  id: string;
  cefr_level?: string;
  primary_concept_id?: string;
  english_gloss?: string;
  difficulty?: number;
  title?: string;
  segments?: RawSegment[];
}

function mapSegment(r: RawSegment): ClozeSegment {
  if (r.kind === 'gap') {
    return {
      kind: 'gap',
      answer: r.answer ?? '',
      acceptedAnswers: r.accepted_answers,
      conceptId: r.concept_id ?? '',
      errorTag: (r.error_tag ?? 'unspecified') as ErrorTag,
    };
  }
  return { kind: 'text', value: r.value ?? '' };
}

function mapPassage(r: RawPassage): ClozePassage {
  return {
    id: r.id,
    cefrLevel: (r.cefr_level ?? 'A1') as ClozePassage['cefrLevel'],
    primaryConceptId: r.primary_concept_id ?? '',
    englishGloss: r.english_gloss ?? '',
    difficulty: (r.difficulty ?? 1) as ClozePassage['difficulty'],
    title: r.title,
    segments: (r.segments ?? []).map(mapSegment),
  };
}

const RAW: RawPassage[] = [
  ...(a1Raw as RawPassage[]),
  ...(a2Raw as RawPassage[]),
  ...(b1Raw as RawPassage[]),
];

export const SEED_PASSAGES: Record<string, ClozePassage> = {};
export const SEED_PASSAGE_IDS: Record<string, string[]> = {};

for (const raw of RAW) {
  const p = mapPassage(raw);
  SEED_PASSAGES[p.id] = p;
  if (!SEED_PASSAGE_IDS[p.primaryConceptId]) SEED_PASSAGE_IDS[p.primaryConceptId] = [];
  SEED_PASSAGE_IDS[p.primaryConceptId].push(p.id);
}
