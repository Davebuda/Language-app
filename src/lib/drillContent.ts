export interface DrillSet {
  id: string
  targetSound: string       // e.g. "kj-lyd"
  description: string       // e.g. "Lyden som i 'kjøpe' og 'kjenne'"
  conceptId?: string
  words: DrillWord[]
}

export interface DrillWord {
  norwegian: string         // the word to practice
  english: string           // translation
  targetPhoneme: string     // the sound to focus on, e.g. "kj"
  audioUrl?: string
}

const A = '/audio/sentences'

export const DRILL_SETS: DrillSet[] = [
  {
    id: 'kj-sound',
    targetSound: 'kj-lyden',
    conceptId: 'common-prepositions',
    description: 'Lyden som i kjøpe og kjenne — en av de vanskeligste for engelsktalende.',
    words: [
      { norwegian: 'kjøpe', english: 'to buy', targetPhoneme: 'kj', audioUrl: `${A}/drill-kjope.mp3` },
      { norwegian: 'kjenne', english: 'to know/feel', targetPhoneme: 'kj', audioUrl: `${A}/drill-kjenne.mp3` },
      { norwegian: 'kjøtt', english: 'meat', targetPhoneme: 'kj', audioUrl: `${A}/drill-kjott.mp3` },
      { norwegian: 'kjøre', english: 'to drive', targetPhoneme: 'kj', audioUrl: `${A}/drill-kjore.mp3` },
      { norwegian: 'kjærlig', english: 'loving', targetPhoneme: 'kj', audioUrl: `${A}/drill-kjaerlig.mp3` },
    ],
  },
  {
    id: 'sj-sound',
    targetSound: 'sj-lyden',
    conceptId: 'basic-adjectives',
    description: 'Lyden som i sjø og skjorte — lik "sh" på engelsk men litt annerledes.',
    words: [
      { norwegian: 'sjø', english: 'lake/sea', targetPhoneme: 'sj', audioUrl: `${A}/drill-sjo.mp3` },
      { norwegian: 'sjanse', english: 'chance', targetPhoneme: 'sj', audioUrl: `${A}/drill-sjanse.mp3` },
      { norwegian: 'skjorte', english: 'shirt', targetPhoneme: 'sk', audioUrl: `${A}/drill-skjorte.mp3` },
      { norwegian: 'skje', english: 'to happen / spoon', targetPhoneme: 'sk', audioUrl: `${A}/drill-skje.mp3` },
      { norwegian: 'sjelden', english: 'rarely', targetPhoneme: 'sj', audioUrl: `${A}/drill-sjelden.mp3` },
    ],
  },
  {
    id: 'oe-sound',
    targetSound: 'ø-lyden',
    conceptId: 'noun-gender',
    description: 'Vokalen ø — finnes ikke på engelsk. Rund munnen som for "o" mens du sier "e".',
    words: [
      { norwegian: 'øl', english: 'beer', targetPhoneme: 'ø', audioUrl: `${A}/drill-ol.mp3` },
      { norwegian: 'øye', english: 'eye', targetPhoneme: 'ø', audioUrl: `${A}/drill-oye.mp3` },
      { norwegian: 'grønn', english: 'green', targetPhoneme: 'ø', audioUrl: `${A}/drill-gronn.mp3` },
      { norwegian: 'søster', english: 'sister', targetPhoneme: 'ø', audioUrl: `${A}/drill-soster.mp3` },
      { norwegian: 'nøkkel', english: 'key', targetPhoneme: 'ø', audioUrl: `${A}/drill-nokkel.mp3` },
    ],
  },
  {
    id: 'retroflex',
    targetSound: 'retroflekse lyder',
    conceptId: 'present-tense-regular',
    description: 'rd, rt, rn, rl — tungen rulles bakover. Typisk for Oslo-dialekt.',
    words: [
      { norwegian: 'bord', english: 'table', targetPhoneme: 'rd', audioUrl: `${A}/drill-bord.mp3` },
      { norwegian: 'fort', english: 'fast/quickly', targetPhoneme: 'rt', audioUrl: `${A}/drill-fort.mp3` },
      { norwegian: 'barn', english: 'child', targetPhoneme: 'rn', audioUrl: `${A}/drill-barn.mp3` },
      { norwegian: 'verden', english: 'world', targetPhoneme: 'rd', audioUrl: `${A}/drill-verden.mp3` },
      { norwegian: 'svart', english: 'black', targetPhoneme: 'rt', audioUrl: `${A}/drill-svart.mp3` },
    ],
  },
]
