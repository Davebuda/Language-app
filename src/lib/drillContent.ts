export interface DrillSet {
  id: string
  targetSound: string       // e.g. "kj-lyd"
  description: string       // e.g. "Lyden som i 'kjøpe' og 'kjenne'"
  words: DrillWord[]
}

export interface DrillWord {
  norwegian: string         // the word to practice
  english: string           // translation
  targetPhoneme: string     // the sound to focus on, e.g. "kj"
  audioUrl?: string         // optional static URL
}

export const DRILL_SETS: DrillSet[] = [
  {
    id: 'kj-sound',
    targetSound: 'kj-lyden',
    description: 'Lyden som i kjøpe og kjenne — en av de vanskeligste for engelsktalende.',
    words: [
      { norwegian: 'kjøpe', english: 'to buy', targetPhoneme: 'kj' },
      { norwegian: 'kjenne', english: 'to know/feel', targetPhoneme: 'kj' },
      { norwegian: 'kjøtt', english: 'meat', targetPhoneme: 'kj' },
      { norwegian: 'kjøre', english: 'to drive', targetPhoneme: 'kj' },
      { norwegian: 'kjærlig', english: 'loving', targetPhoneme: 'kj' },
    ],
  },
  {
    id: 'sj-sound',
    targetSound: 'sj-lyden',
    description: 'Lyden som i sjø og skjorte — lik "sh" på engelsk men litt annerledes.',
    words: [
      { norwegian: 'sjø', english: 'lake/sea', targetPhoneme: 'sj' },
      { norwegian: 'sjanse', english: 'chance', targetPhoneme: 'sj' },
      { norwegian: 'skjorte', english: 'shirt', targetPhoneme: 'sk' },
      { norwegian: 'skje', english: 'to happen / spoon', targetPhoneme: 'sk' },
      { norwegian: 'sjelden', english: 'rarely', targetPhoneme: 'sj' },
    ],
  },
  {
    id: 'oe-sound',
    targetSound: 'ø-lyden',
    description: 'Vokalen ø — finnes ikke på engelsk. Rund munnen som for "o" mens du sier "e".',
    words: [
      { norwegian: 'øl', english: 'beer', targetPhoneme: 'ø' },
      { norwegian: 'øye', english: 'eye', targetPhoneme: 'ø' },
      { norwegian: 'grønn', english: 'green', targetPhoneme: 'ø' },
      { norwegian: 'søster', english: 'sister', targetPhoneme: 'ø' },
      { norwegian: 'nøkkel', english: 'key', targetPhoneme: 'ø' },
    ],
  },
  {
    id: 'retroflex',
    targetSound: 'retroflekse lyder',
    description: 'rd, rt, rn, rl — tungen rulles bakover. Typisk for Oslo-dialekt.',
    words: [
      { norwegian: 'bord', english: 'table', targetPhoneme: 'rd' },
      { norwegian: 'fort', english: 'fast/quickly', targetPhoneme: 'rt' },
      { norwegian: 'barn', english: 'child', targetPhoneme: 'rn' },
      { norwegian: 'verden', english: 'world', targetPhoneme: 'rd' },
      { norwegian: 'svart', english: 'black', targetPhoneme: 'rt' },
    ],
  },
]
