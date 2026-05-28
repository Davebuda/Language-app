import { describe, it, expect } from 'vitest'
import { validateNorwegianOutput } from '@/ai/validate'

// Regression coverage for the AI validity gate. These lock in fixes where the
// gate was wrongly REJECTING valid Norwegian (accented chars, em-dash, and
// 3rd-person pronouns), while confirming it still catches the real failures
// (English drift, gibberish, fabricated compounds, foreign scripts).
describe('validateNorwegianOutput', () => {
  describe('accepts valid Norwegian (regression: previously false-rejected)', () => {
    it.each([
      ['accented é in én/idé',     'Jeg har én god idé.'],
      ['accented é in kafé',       'Vi drar til en kafé i dag.'],
      ['em-dash',                  'Det er fint — veldig fint.'],
      ['3rd-person han',           'Han tar medisiner hver dag.'],
      ['3rd-person hun',           'Hun kjøper melk i butikken.'],
      ['3rd-person de + sett',     'De har sett filmen.'],
      ['guillemets',               'Hun sa «hei» til meg.'],
      ['plain A1 sentence',        'Jeg går til butikken.'],
    ])('accepts %s', (_label, text) => {
      expect(validateNorwegianOutput(text).valid).toBe(true)
    })
  })

  describe('rejects genuinely invalid output', () => {
    it('rejects English drift', () => {
      const r = validateNorwegianOutput('This is the way that the world works for us')
      expect(r.valid).toBe(false)
      expect(r.reason).toBe('english-drift')
    })

    it('rejects foreign scripts (non-Norwegian chars)', () => {
      const r = validateNorwegianOutput('Привет мир как дела')
      expect(r.valid).toBe(false)
      expect(r.reason).toBe('non-norwegian-chars')
    })

    it('rejects fabricated synthetic compounds', () => {
      const r = validateNorwegianOutput('Jeg liker superlangtsammensattordet veldig godt')
      expect(r.valid).toBe(false)
      expect(r.reason).toBe('synthetic-compound')
    })

    it('rejects text with no Norwegian markers (gibberish/loanwords)', () => {
      const r = validateNorwegianOutput('pizza pasta lasagne spaghetti')
      expect(r.valid).toBe(false)
      expect(r.reason).toBe('no-norwegian-markers')
    })

    it('rejects empty text', () => {
      const r = validateNorwegianOutput('   ')
      expect(r.valid).toBe(false)
    })
  })

  it('passes very short fragments through (too short to classify)', () => {
    expect(validateNorwegianOutput('Takk!').valid).toBe(true)
  })
})
