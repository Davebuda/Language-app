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

export function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
}

export function extractBlank(template: string): { before: string; after: string } {
  // Blank markers are inconsistent across the corpus: A1/A2 use '___' (3) while
  // B1/B2 use '_____' (5). Split on any run of underscores so both render.
  const parts = template.split(/_+/);
  return { before: parts[0] ?? '', after: parts[1] ?? '' };
}
