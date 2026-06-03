import { describe, it, expect } from 'vitest'
import { checkWordOrder } from '@/lib/word-order'

const canonical = 'Jeg går til skolen hver dag'

describe('checkWordOrder', () => {
  it('accepts the canonical order', () => {
    expect(checkWordOrder(canonical.split(' '), canonical)).toBe(true)
  })

  it('rejects a wrong order', () => {
    expect(checkWordOrder(['går', 'Jeg', 'til', 'skolen', 'hver', 'dag'], canonical)).toBe(false)
  })

  it('rejects a wrong word count', () => {
    expect(checkWordOrder(['Jeg', 'går', 'til', 'skolen'], canonical)).toBe(false)
  })

  it('normalizes case and punctuation', () => {
    expect(checkWordOrder(['jeg', 'GÅR', 'til', 'skolen', 'hver', 'dag.'], canonical)).toBe(true)
  })

  describe('with acceptedOrders (opt-in alternatives)', () => {
    // Legal V2 fronting variant: "Hver dag går jeg til skolen"
    const alt = 'Hver dag går jeg til skolen'

    it('accepts a valid alternative order when authored', () => {
      expect(checkWordOrder(alt.split(' '), canonical, [alt])).toBe(true)
    })

    it('still accepts the canonical order when alternatives exist', () => {
      expect(checkWordOrder(canonical.split(' '), canonical, [alt])).toBe(true)
    })

    it('rejects an order that matches neither canonical nor any alternative', () => {
      expect(checkWordOrder(['skolen', 'jeg', 'går', 'til', 'hver', 'dag'], canonical, [alt])).toBe(false)
    })
  })

  describe('regression guard — absent acceptedOrders behaves exactly as before', () => {
    it('rejects an alternative order when no acceptedOrders are supplied', () => {
      // Without the opt-in field, only the canonical order passes — existing
      // content (none of which has acceptedOrders) is unaffected.
      const alt = 'Hver dag går jeg til skolen'
      expect(checkWordOrder(alt.split(' '), canonical)).toBe(false)
    })
  })
})
