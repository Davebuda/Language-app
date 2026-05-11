export interface GrammarExplainer {
  conceptId: string
  title: string
  shortRule: string
  explanation: string
  examples: Array<{ norwegian: string; english: string; note?: string }>
  commonMistakes: string[]
  tip: string
}

export const GRAMMAR_EXPLAINERS: Record<string, GrammarExplainer> = {
  'noun-gender': {
    conceptId: 'noun-gender',
    title: 'Substantivets kjønn',
    shortRule: 'Norske substantiver har tre kjønn: hankjønn (en), hunkjønn (ei) og intetkjønn (et).',
    explanation:
      'Every Norwegian noun belongs to one of three genders — masculine (en), feminine (ei), or neuter (et). Gender determines which article you use, how adjectives agree, and how the definite suffix is formed. Unfortunately there are few reliable rules, so gender must largely be learned with each noun.',
    examples: [
      { norwegian: 'en bil', english: 'a car', note: 'masculine' },
      { norwegian: 'ei jente', english: 'a girl', note: 'feminine' },
      { norwegian: 'et hus', english: 'a house', note: 'neuter' },
      { norwegian: 'bilen, jenta, huset', english: 'the car, the girl, the house', note: 'definite suffix' },
    ],
    commonMistakes: [
      'Using "en" for all nouns (English habit)',
      'Forgetting that feminine nouns can also use "en" in Bokmål (both "en jente" and "ei jente" are correct)',
      'Wrong definite suffix: "huset" not "husen"',
    ],
    tip: 'Learn each noun with its article. Think: "en bil" not just "bil". Make it a two-word unit from day one.',
  },

  'indefinite-articles': {
    conceptId: 'indefinite-articles',
    title: 'Ubestemte artikler',
    shortRule: 'en (hankjønn), ei (hunkjønn), et (intetkjønn) — tilsvarer "a/an" på engelsk.',
    explanation:
      '"En", "ei", and "et" are the indefinite articles in Norwegian. They precede the noun and match its gender. In Bokmål, "en" is also acceptable for feminine nouns, so you will see both "ei bok" and "en bok".',
    examples: [
      { norwegian: 'Jeg har en hund.', english: 'I have a dog.' },
      { norwegian: 'Hun leser ei bok.', english: 'She is reading a book.' },
      { norwegian: 'Vi bor i et hus.', english: 'We live in a house.' },
    ],
    commonMistakes: [
      'Using "a/an" word-for-word from English',
      'Forgetting the article entirely',
      'Using "et" for all neuter nouns without checking',
    ],
    tip: 'Start with en/et. Feminine "ei" is optional in Bokmål — master the two-gender system first, then add ei as a bonus.',
  },

  'definite-articles-singular': {
    conceptId: 'definite-articles-singular',
    title: 'Bestemt form entall',
    shortRule: 'Legg til -en (hankjønn), -a eller -en (hunkjønn), eller -et (intetkjønn) på substantivet.',
    explanation:
      'Norwegian does not have a separate "the" word. Instead, the definite article is attached as a suffix to the noun. Masculine nouns get -en, feminine nouns get -a (or -en in Bokmål), and neuter nouns get -et.',
    examples: [
      { norwegian: 'bil → bilen', english: 'car → the car' },
      { norwegian: 'jente → jenta / jenten', english: 'girl → the girl' },
      { norwegian: 'hus → huset', english: 'house → the house' },
      { norwegian: 'Hunden er stor.', english: 'The dog is big.' },
    ],
    commonMistakes: [
      'Placing "the" before the noun like in English',
      'Using the wrong suffix: "husen" instead of "huset"',
      'Forgetting that the suffix changes with gender',
    ],
    tip: '"The" is a glue word in Norwegian — it sticks to the end of the noun. "The car" = "bil" + "en" = "bilen".',
  },

  'v2-word-order': {
    conceptId: 'v2-word-order',
    title: 'V2-regelen',
    shortRule: 'Det finitte verbet er alltid i posisjon 2 i en norsk hovedsetning.',
    explanation:
      'The V2 rule (verb-second) is the most important word order rule in Norwegian. No matter what you put first in a main clause — subject, adverb, time phrase, object — the finite verb must always come second. This is called inversion.',
    examples: [
      { norwegian: 'Jeg spiser middag.', english: 'I eat dinner.', note: 'S-V-O: normal order' },
      { norwegian: 'I dag spiser jeg middag.', english: 'Today I eat dinner.', note: 'Adverb first → verb still 2nd' },
      { norwegian: 'Middag spiser jeg ikke.', english: 'Dinner I don\'t eat.', note: 'Object first → inversion' },
    ],
    commonMistakes: [
      'Not inverting after a fronted adverb: "I dag jeg spiser" (wrong)',
      'Putting the verb third or fourth in the clause',
      'Confusing main clause V2 with subordinate clause (no V2 in "at jeg spiser")',
    ],
    tip: 'Count the positions. Position 1 = anything you want to emphasise. Position 2 = verb. Always. No exceptions in main clauses.',
  },

  'personal-pronouns': {
    conceptId: 'personal-pronouns',
    title: 'Personlige pronomen',
    shortRule: 'jeg, du, han/hun/den/det, vi, dere, de — tilsvarer I, you, he/she/it, we, you, they.',
    explanation:
      'Norwegian personal pronouns are similar to English. Key differences: Norwegian has separate forms for "it" depending on noun gender (den for en/ei nouns, det for et nouns). "De" can mean both "they" and formal "you" (capital De), though the formal use is rare.',
    examples: [
      { norwegian: 'Jeg er norsk.', english: 'I am Norwegian.' },
      { norwegian: 'Han er lærer.', english: 'He is a teacher.' },
      { norwegian: 'Den er stor. / Det er stort.', english: 'It is big.', note: 'gender agreement' },
      { norwegian: 'Vi lærer norsk.', english: 'We are learning Norwegian.' },
    ],
    commonMistakes: [
      'Using "det" for all "it" references regardless of noun gender',
      'Confusing "dere" (you plural) and "de" (they)',
    ],
    tip: '"Det" is also used as a dummy subject: "Det regner" (It is raining). This det doesn\'t refer to anything — it just fills position 1.',
  },

  'plural-formation': {
    conceptId: 'plural-formation',
    title: 'Flertall',
    shortRule: 'Ubestemt flertall: oftest -er (biler). Bestemt flertall: -ene (bilene).',
    explanation:
      'Most Norwegian nouns form the indefinite plural with -er. Some short neuter nouns have zero plural (et hus → hus). The definite plural always gets -ene. Some nouns have irregular plurals that must be memorised.',
    examples: [
      { norwegian: 'bil → biler → bilene', english: 'car → cars → the cars' },
      { norwegian: 'bok → bøker → bøkene', english: 'book → books → the books', note: 'vowel change' },
      { norwegian: 'hus → hus → husene', english: 'house → houses → the houses', note: 'zero plural' },
      { norwegian: 'barn → barn → barna', english: 'child → children → the children' },
    ],
    commonMistakes: [
      'Adding -s to form plurals (English habit)',
      'Forgetting vowel changes in irregular plurals (bok→bøker)',
      'Using -er for neuter nouns that take zero plural',
    ],
    tip: 'Learn the plural form alongside the noun: "en bil, biler". The definite plural -ene is almost always regular.',
  },

  'verb-conjugation': {
    conceptId: 'verb-conjugation',
    title: 'Verbets bøying i presens',
    shortRule: 'Legg -r til stammen: snakk → snakker. Samme form for alle personer.',
    explanation:
      'Norwegian present tense is simpler than English: all persons use the same form. Add -r to the infinitive stem. There is no "he snakks" vs "I snakk" — it\'s "snakker" for everyone. Irregular verbs (er, har, gjør) must be memorised.',
    examples: [
      { norwegian: 'jeg snakker, du snakker, han snakker', english: 'I speak, you speak, he speaks' },
      { norwegian: 'jeg er, du er, hun er', english: 'I am, you are, she is', note: 'irregular: være' },
      { norwegian: 'jeg har, du har, vi har', english: 'I have, you have, we have', note: 'irregular: ha' },
    ],
    commonMistakes: [
      'Adding -er to the infinitive instead of the stem: "snakkeer" (wrong)',
      'Changing the form for different persons',
      'Forgetting that "er" is present of "å være" (to be)',
    ],
    tip: 'Strip "å" from the infinitive to get the stem, then add -r. "å snakke" → "snakk" → "snakker". For one-syllable stems ending in a vowel: add just -r (bo → bor).',
  },
}
