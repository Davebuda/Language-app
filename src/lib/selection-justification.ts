// "Why this exercise?" — turns a SessionItem's selectionReason into a one-line
// Norwegian justification, tied to the learner's own recent-miss evidence where
// available. Surfacing it makes the scheduling pillar of the moat felt, not just
// computed (the bare badge said "Svakt punkt" without saying WHY). Pure; reads
// only existing fingerprint fields and never throws on a legacy mastery row.

import type { SelectionReason } from '@/types/session'
import type { ConceptMastery } from '@/types/fingerprint'

export function selectionJustification(
  reason: SelectionReason,
  mastery?: ConceptMastery,
): string {
  switch (reason) {
    case 'weak_concept': {
      const recent = mastery?.recentOutcomes ?? []
      const misses = recent.filter((o) => !o).length
      if (recent.length > 0 && misses > 0) return `Du bommet ${misses} av ${recent.length} sist`
      return 'Et svakt punkt for deg'
    }
    case 'review_due':
      return 'På tide å repetere'
    case 'decaying':
      return 'Vi holder dette ved like'
    case 'new_material':
      return 'Nytt for deg'
    case 'interleaving':
      return 'Blandet inn for å feste det'
    case 'weekly_focus':
      return 'Ukens fokus'
    case 'repair_target':
      return 'Retting akkurat nå'
    case 'cold_start':
      return 'Vi kartlegger nivået ditt'
    case 'root_cause':
      return 'Dette ligger bak flere av feilene dine'
    case 'notebook_practice':
      return 'Fra notatboka di'
    default:
      return 'Tilpasset deg'
  }
}
