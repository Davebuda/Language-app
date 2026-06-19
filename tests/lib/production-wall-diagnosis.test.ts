import { describe, it, expect } from 'vitest'
import { deriveDiagnosisHighlight } from '@/lib/production-wall'
import type { DiagnosisResult } from '@/engine/diagnosis'

function diag(overrides: Partial<DiagnosisResult> = {}): DiagnosisResult {
  return {
    rootCauseConceptId: 'noun-gender',
    confidence: 0.85,
    reasoning: 'irrelevant for the highlight',
    affectedConceptIds: ['indefinite-articles', 'adjective-agreement'],
    recommendedFocus: 'mechanics',
    ...overrides,
  }
}

const LABELS: Record<string, string> = {
  'indefinite-articles': 'Ubestemt artikkel',
  'adjective-agreement': 'Adjektivsamsvar',
}
const labelOf = (id: string): string | undefined => LABELS[id]

describe('deriveDiagnosisHighlight', () => {
  it('maps recommendedFocus to a Norwegian label', () => {
    expect(deriveDiagnosisHighlight(diag({ recommendedFocus: 'production' }), labelOf).focusLabel).toBe('Produksjon')
    expect(deriveDiagnosisHighlight(diag({ recommendedFocus: 'recognition' }), labelOf).focusLabel).toBe('Gjenkjenning')
    expect(deriveDiagnosisHighlight(diag({ recommendedFocus: 'mechanics' }), labelOf).focusLabel).toBe('Form')
    expect(deriveDiagnosisHighlight(diag({ recommendedFocus: 'application' }), labelOf).focusLabel).toBe('Bruk')
  })

  it('tier is strong at confidence >= 0.7, early below it (the 0.45 fallback)', () => {
    expect(deriveDiagnosisHighlight(diag({ confidence: 0.85 }), labelOf).confidenceTier).toBe('strong')
    expect(deriveDiagnosisHighlight(diag({ confidence: 0.7 }), labelOf).confidenceTier).toBe('strong')
    expect(deriveDiagnosisHighlight(diag({ confidence: 0.45 }), labelOf).confidenceTier).toBe('early')
  })

  it('resolves affected concept labels and caps at 2', () => {
    const h = deriveDiagnosisHighlight(
      diag({ affectedConceptIds: ['indefinite-articles', 'adjective-agreement', 'noun-gender'] }),
      labelOf,
    )
    expect(h.affectedLabels).toEqual(['Ubestemt artikkel', 'Adjektivsamsvar'])
  })

  it('humanizes an unknown slug instead of leaking it raw', () => {
    const h = deriveDiagnosisHighlight(diag({ affectedConceptIds: ['cross-level-concept'] }), labelOf)
    expect(h.affectedLabels).toEqual(['cross level concept'])
  })

  it('handles an empty affectedConceptIds list', () => {
    const h = deriveDiagnosisHighlight(diag({ affectedConceptIds: [] }), labelOf)
    expect(h.affectedLabels).toEqual([])
  })
})
