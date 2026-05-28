export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/[.,!?;:]/g, '');
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
