export function normalizeAnswer(s: string): string {
  // Formatting-only normalization: fixes spurious wrong-marks (extra spaces,
  // curly vs straight apostrophes/quotes) WITHOUT loosening meaning — it can
  // never turn a genuinely wrong answer into a correct one. Semantic paraphrase
  // acceptance is intentionally NOT done here (it would risk false-positives);
  // that is handled per-sentence via accepted-answers lists (cf. cloze gaps).
  return s
    .trim()
    .toLowerCase()
    .replace(/[‘’ʼ′]/g, "'") // curly/modifier apostrophes → straight
    .replace(/[“”″]/g, '"') // curly quotes → straight
    .replace(/[.,!?;:]/g, '')
    .replace(/\s+/g, ' ') // collapse internal whitespace runs
    .trim();
}

// Expand unambiguous English contractions to their full forms so a learner who
// writes "I don't know" is graded identical to "I do not know". Operates on an
// already formatting-normalized (lowercased, straight-apostrophe) string. Only
// safe, meaning-preserving pairs are handled; ambiguous clitics ('s = is/has/
// possessive, 'd = had/would) are deliberately left alone to avoid false matches.
// Order matters: irregular forms (won't/can't) run before the generic n't rule.
const CONTRACTION_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bwon't\b/g, 'will not'],
  [/\bcan't\b/g, 'cannot'],
  [/\bshan't\b/g, 'shall not'],
  [/n't\b/g, ' not'], // don't→do not, isn't→is not, didn't→did not, …
  [/\bi'm\b/g, 'i am'],
  [/'re\b/g, ' are'],
  [/'ve\b/g, ' have'],
  [/'ll\b/g, ' will'],
];

export function expandContractions(s: string): string {
  let out = s;
  for (const [re, rep] of CONTRACTION_RULES) out = out.replace(re, rep);
  return out.replace(/\s+/g, ' ').trim();
}

export function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  const a = normalizeAnswer(userAnswer);
  const b = normalizeAnswer(correctAnswer);
  if (a === b) return true;
  // Contraction tolerance: canonicalize both sides and compare again. This only
  // collapses true equivalences (don't ⇔ do not) — it cannot make a genuinely
  // different answer match. Norwegian text has no English contractions, so this
  // is a no-op for Norwegian grading (cloze, translate-to-norwegian).
  return expandContractions(a) === expandContractions(b);
}

// Grade against the canonical answer OR any author-supplied accepted alternative
// (valid paraphrase/synonym), each with the same formatting + contraction
// tolerance. Mirrors the cloze gap.acceptedAnswers pattern. Alternatives are
// linguist-gated content; when none are supplied this is identical to checkAnswer.
export function checkAnswerWithAlternatives(
  userAnswer: string,
  correctAnswer: string,
  acceptedAnswers: readonly string[] = [],
): boolean {
  if (checkAnswer(userAnswer, correctAnswer)) return true;
  return acceptedAnswers.some((alt) => checkAnswer(userAnswer, alt));
}

export function extractBlank(template: string): { before: string; after: string } {
  // Blank markers are inconsistent across the corpus: A1/A2 use '___' (3) while
  // B1/B2 use '_____' (5). Split on any run of underscores so both render.
  const parts = template.split(/_+/);
  return { before: parts[0] ?? '', after: parts[1] ?? '' };
}
