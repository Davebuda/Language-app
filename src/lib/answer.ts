export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/[.,!?;:]/g, '');
}

export function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
}

export function extractBlank(template: string): { before: string; after: string } {
  const parts = template.split('___');
  return { before: parts[0] ?? '', after: parts[1] ?? '' };
}
