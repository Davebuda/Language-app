const CONCEPT_COLORS: Record<string, string> = {
  'noun-gender': '#a8ef6a',
  'indefinite-articles': '#7eb8ef',
  'definite-articles-singular': '#ef7eb8',
  'plural-formation': '#efcc7e',
  'definite-articles-plural': '#b87eef',
  'present-tense-regular': '#7eefcc',
  'subject-pronouns': '#ef9e7e',
  'v2-word-order': '#ef7e7e',
  'negation': '#7eefb8',
  'interrogatives': '#c4ef7e',
  'adjective-agreement': '#7ec4ef',
  'modal-verbs': '#ef7ec4',
}

const PALETTE = Object.values(CONCEPT_COLORS)

export function getConceptColor(id: string, index: number): string {
  return CONCEPT_COLORS[id] ?? PALETTE[index % PALETTE.length]
}
