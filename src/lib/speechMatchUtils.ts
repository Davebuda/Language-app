// Shared word-matching utilities for shadowing and pronunciation drill modes.

export function normaliseWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/[.,!?;:«»"'()\-]/g, '')
    .trim()
}

export function tokenise(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

export interface WordMatch {
  word: string
  matched: boolean
}

export function computeWordMatches(expected: string, actual: string): WordMatch[] {
  const expectedTokens = tokenise(expected)
  const actualNormalised = new Set(tokenise(actual).map(normaliseWord))
  return expectedTokens.map((word) => ({
    word,
    matched: actualNormalised.has(normaliseWord(word)),
  }))
}

export function computeMatchScore(expected: string, actual: string): number {
  const expectedTokens = tokenise(expected)
  if (expectedTokens.length === 0) return 1
  const actualNormalised = new Set(tokenise(actual).map(normaliseWord))
  const matchedCount = expectedTokens.filter((w) =>
    actualNormalised.has(normaliseWord(w))
  ).length
  return matchedCount / expectedTokens.length
}
