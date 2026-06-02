// B2 vocabulary track content contract (Phase 3, Slice 3.1).
// Source: content/vocab/b2-clusters.json, parsed deterministically from
// norsk_b2_hverdagsord.md by scripts/parse-b2-vocab.mjs, linguist-gated.

// Conjugation class — the source's "Mønstre du kan stole på" taxonomy.
// group-1: -et/-et · group-2: -te/-t · group-3: -dde/-dd · strong: irregular (a→u etc.)
export type AblautGroup = 'group-1' | 'group-2' | 'group-3' | 'strong'

export interface VocabWord {
  id: string
  infinitive: string // "å klø (seg)"
  lemma: string // "klø"
  presens: string
  preteritum: string
  perfektum: string // includes the "har " auxiliary, e.g. "har klødd"
  irregular: boolean
  ablautGroup: AblautGroup
  reflexive: boolean
  particle: string | null // e.g. "igjen / på / av"
  clusterId: string
  gloss: string | null // EN gloss — not in source per-word; added later, never fabricated at parse time
}

export interface VocabSentence {
  id: string
  no: string // Norwegian carrier (bold markers stripped)
  en: string // English gloss
  targetSurfaces: string[] // bolded surface forms in the sentence
  wordIds: string[] // VocabWord ids exercised by this sentence
  clusterId: string
  cefrLevel: 'B2'
}

export interface VocabCluster {
  id: string
  index: number
  name: string // Norwegian theme name
  wordIds: string[]
  sentenceIds: string[]
}

export interface VocabContent {
  level: 'B2'
  source: string
  generatedBy: string
  clusters: VocabCluster[]
  words: VocabWord[]
  sentences: VocabSentence[]
}
