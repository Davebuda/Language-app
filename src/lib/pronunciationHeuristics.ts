// Maps (expected word → common English-speaker substitution pattern) to a hint.
// If the transcript contains a word that matches a known substitution,
// surface the corresponding hint to the learner.

export interface HeuristicHint {
  pattern: string    // what they likely said (normalised)
  hint: string       // short Norwegian feedback
}

export const PRONUNCIATION_HEURISTICS: Record<string, HeuristicHint[]> = {
  // kj-lyd: English speakers often say "sh" or "k" instead
  'kjøpe': [
    { pattern: 'shøpe', hint: 'kj-lyden er ikke "sh" — prøv å si den høyere oppe i munnen.' },
    { pattern: 'køpe',  hint: 'Ikke glem kj-lyden — det er ikke bare "k".' },
  ],
  'kjenne': [
    { pattern: 'shenne', hint: 'kj-lyden er ikke "sh".' },
    { pattern: 'kenne',  hint: 'Husk kj-lyden foran "j".' },
  ],
  'kjøtt': [
    { pattern: 'shøtt', hint: 'kj-lyden er ikke "sh" — hold tungen flatt mot ganen.' },
    { pattern: 'kott',  hint: 'Husk å myke opp k-en til kj-lyd.' },
  ],
  'kjøre': [
    { pattern: 'shøre', hint: 'kj-lyden er ikke "sh" — prøv høyere oppe i munnen.' },
    { pattern: 'kore',  hint: 'Ikke glem kj-lyden.' },
  ],
  'kjærlig': [
    { pattern: 'shærlig', hint: 'kj-lyden er ikke "sh".' },
    { pattern: 'kærlig',  hint: 'Husk kj-lyden — det er mykere enn "k".' },
  ],
  // ø-lyd: often substituted with "u" or "e"
  'øl': [
    { pattern: 'ul',  hint: 'ø er ikke "u" — rund munnen mer og si "e" samtidig.' },
    { pattern: 'el',  hint: 'ø er mellom "u" og "e" — prøv igjen.' },
  ],
  'øye': [
    { pattern: 'uye', hint: 'ø er ikke "u" — rund leppene mens du sier "e".' },
    { pattern: 'eye', hint: 'ø er ikke "e" på norsk — rund leppene mer.' },
  ],
  'grønn': [
    { pattern: 'grunn', hint: 'ø er ikke "u" — rund leppene mens du sier "e".' },
    { pattern: 'green', hint: 'ø på norsk er ikke lik "ee" på engelsk — rund munnen.' },
  ],
  'søster': [
    { pattern: 'suster', hint: 'ø er ikke "u" — rund leppene og si "e" inni.' },
    { pattern: 'sester', hint: 'ø er ikke "e" — leppene skal rundes.' },
  ],
  'nøkkel': [
    { pattern: 'nukkel', hint: 'ø er ikke "u" — rund munnen som for "o" mens du tenker "e".' },
    { pattern: 'nekkel', hint: 'ø er ikke "e" — leppene skal rundes mer.' },
  ],
  // Retroflexes: rd, rt, rn often lose the retroflex quality
  'bord': [
    { pattern: 'board', hint: 'Prøv å rulle tungen bakover for "rd"-lyden — det er retrofleks.' },
    { pattern: 'bor',   hint: 'Ikke glem "d" på slutten — men det er retrofleks, ikke vanlig "d".' },
  ],
  'fort': [
    { pattern: 'for',  hint: 'Husk "t" på slutten — retrofleks "rt" med tungen bakover.' },
    { pattern: 'fot',  hint: '"rt" er retrofleks — tungen skal rulle bakover mot ganen.' },
  ],
  'barn': [
    { pattern: 'bar',  hint: '"rn" er retrofleks i norsk — tungen bakover.' },
    { pattern: 'born', hint: 'Vær obs på "a"-lyden i "barn" — det er en åpen "a".' },
  ],
  'verden': [
    { pattern: 'verdan', hint: '"rd" er retrofleks — prøv å rulle tungen bakover.' },
    { pattern: 'verden', hint: null as unknown as string }, // exact match — no hint needed
  ],
  'svart': [
    { pattern: 'svar',  hint: 'Husk "t" på slutten med retrofleks "rt"-lyd.' },
    { pattern: 'svort', hint: 'Vær obs på "a"-lyden — det er en åpen, bred "a" i "svart".' },
  ],
}

export function getHeuristicHint(
  expectedWord: string,
  transcribedText: string,
): string | null {
  const hints = PRONUNCIATION_HEURISTICS[expectedWord.toLowerCase()]
  if (!hints) return null

  const normalised = transcribedText.toLowerCase().replace(/[.,!?]/g, '').trim()
  for (const h of hints) {
    if (h.hint === null) continue
    if (normalised.includes(h.pattern)) return h.hint
  }
  return null
}
