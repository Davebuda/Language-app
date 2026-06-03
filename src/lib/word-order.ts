import { normalizeAnswer } from './answer'

/**
 * Grade a word-order answer.
 *
 * Correct when the assembled order matches the canonical sentence order OR any
 * author-supplied accepted alternative (compared word-by-word, normalized for
 * case/punctuation via normalizeAnswer). Norwegian frequently allows more than
 * one valid order (e.g. legal V2 fronting variants); accepting only the
 * canonical split wrongly failed those — and a falsely-rejected answer logs a
 * phantom error and resets SRS (pipeline honesty).
 *
 * When `acceptedOrders` is absent, only the canonical order passes — identical
 * to the original grader, so existing content is never affected (opt-in).
 *
 * Pure: extracted from WordOrderExercise so it can be unit-tested without
 * rendering the component.
 */
export function checkWordOrder(
  userWords: string[],
  canonical: string,
  acceptedOrders?: string[],
): boolean {
  const userNorm = userWords.map(normalizeAnswer)
  const candidates = [canonical, ...(acceptedOrders ?? [])]
  return candidates.some((candidate) => {
    const candWords = candidate.split(' ').map(normalizeAnswer)
    return (
      userNorm.length === candWords.length &&
      userNorm.every((w, i) => w === candWords[i])
    )
  })
}
