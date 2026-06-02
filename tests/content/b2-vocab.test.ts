import { describe, it, expect } from 'vitest'
import vocabRaw from '../../content/vocab/b2-clusters.json'
import type { VocabContent, AblautGroup } from '@/types/vocab'

const content = vocabRaw as unknown as VocabContent
const ABLAUT: AblautGroup[] = ['group-1', 'group-2', 'group-3', 'strong']

describe('B2 vocab content — mechanical validation (Slice 3.1)', () => {
  it('is B2 and locks the ingested counts (regression guard on the source)', () => {
    expect(content.level).toBe('B2')
    expect(content.clusters).toHaveLength(6)
    expect(content.words).toHaveLength(66)
    expect(content.sentences).toHaveLength(58)
  })

  it('every word has complete, well-formed conjugation data', () => {
    for (const w of content.words) {
      expect(w.id, `word id for ${w.infinitive}`).toBeTruthy()
      expect(w.presens, `presens for ${w.id}`).toBeTruthy()
      expect(w.preteritum, `preteritum for ${w.id}`).toBeTruthy()
      expect(w.perfektum, `perfektum for ${w.id}`).toMatch(/^har /) // includes the auxiliary
      expect(ABLAUT).toContain(w.ablautGroup)
      expect(typeof w.irregular).toBe('boolean')
    }
  })

  it('irregular ⇔ strong ablaut group (no mislabeling)', () => {
    for (const w of content.words) {
      if (w.irregular) expect(w.ablautGroup, `${w.id} irregular`).toBe('strong')
      else expect(w.ablautGroup, `${w.id} regular`).not.toBe('strong')
    }
  })

  it('word ids are unique', () => {
    const ids = content.words.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every sentence is B2, glossed, and references only existing words/clusters', () => {
    const wordIds = new Set(content.words.map((w) => w.id))
    const clusterIds = new Set(content.clusters.map((c) => c.id))
    for (const s of content.sentences) {
      expect(s.cefrLevel).toBe('B2')
      expect(s.no, `no for ${s.id}`).toBeTruthy()
      expect(s.en, `en gloss for ${s.id}`).toBeTruthy()
      expect(s.no.includes('**'), `${s.id} bold markers stripped`).toBe(false)
      expect(s.wordIds.length, `${s.id} has ≥1 word`).toBeGreaterThan(0)
      for (const wid of s.wordIds) expect(wordIds.has(wid), `${s.id} → ${wid} exists`).toBe(true)
      expect(clusterIds.has(s.clusterId), `${s.id} cluster`).toBe(true)
    }
  })

  it('every cluster is non-empty and its id references are valid + complete', () => {
    const wordIds = new Set(content.words.map((w) => w.id))
    const sentenceIds = new Set(content.sentences.map((s) => s.id))
    let sentenceRefSum = 0
    for (const c of content.clusters) {
      expect(c.wordIds.length, `${c.id} words`).toBeGreaterThan(0)
      expect(c.sentenceIds.length, `${c.id} sentences`).toBeGreaterThan(0)
      for (const wid of c.wordIds) expect(wordIds.has(wid), `${c.id} → ${wid}`).toBe(true)
      for (const sid of c.sentenceIds) expect(sentenceIds.has(sid), `${c.id} → ${sid}`).toBe(true)
      sentenceRefSum += c.sentenceIds.length
    }
    // every sentence belongs to exactly one cluster
    expect(sentenceRefSum).toBe(content.sentences.length)
  })

  it('captures the strong-verb a→u pattern the source highlights', () => {
    // trekke→trakk→trukket, rekke→rakk→rukket, slippe→slapp→sluppet, strekke→strakk→strukket
    const byId = new Map(content.words.map((w) => [w.id, w]))
    for (const id of ['trekke', 'rekke', 'slippe', 'strekke']) {
      const w = byId.get(id)
      expect(w, `${id} present`).toBeDefined()
      expect(w!.irregular).toBe(true)
      expect(w!.preteritum).toMatch(/a/)
      expect(w!.perfektum).toMatch(/u/)
    }
  })

  it('linguist-gated corrections stay applied (blocker regression guard)', () => {
    const byId = new Map(content.words.map((w) => [w.id, w]))
    // boye: -de/-d → group-2 (was mis-derived as group-1)
    expect(byId.get('boye')!.ablautGroup).toBe('group-2')
    // gni: source "gned/uregelrett" was non-standard → standard weak Bokmål
    const gni = byId.get('gni')!
    expect(gni.preteritum).toBe('gnidde')
    expect(gni.irregular).toBe(false)
    expect(gni.ablautGroup).toBe('group-3')
    // b2v-57: source omitted the bold markup → target surfaces filled
    const s57 = content.sentences.find((s) => s.id === 'b2v-57')!
    expect(s57.targetSurfaces).toEqual(expect.arrayContaining(['gjemte', 'fant']))
  })
})
