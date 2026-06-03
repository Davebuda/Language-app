/**
 * Format a concept's `nextReviewAt` (SRS due date) as a short Norwegian phrase.
 *
 * Returns '' when there is no scheduled review (null/undefined/empty) so callers
 * can omit the line with a truthiness guard. Extracted from the session-complete
 * screen so Progress and Profile reuse the exact same wording — single source of
 * truth for the SRS schedule phrasing.
 */
export function formatNextReview(isoDate: string | null | undefined): string {
  if (!isoDate) return ''
  const days = Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000)
  if (days <= 0) return 'I dag'
  if (days === 1) return 'I morgen'
  return `Om ${days} dager`
}
