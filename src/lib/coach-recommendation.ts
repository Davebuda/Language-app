import type { MistakeFingerprint } from '@/types/fingerprint'
import type { ConceptGraph } from '@/types/concepts'
import type { SchedulerOutput } from '@/engine/scheduler'
import type { LaneId } from './lane-completion'
import { getCompletedLanes, allLanesDone } from './lane-completion'

export interface CoachRecommendation {
  laneId: LaneId | 'weekly-check' | 'celebration'
  label: string
  title: string
  subtitle: string
  reason: string | null
  href: string
  ctaLabel: string
  compositionBadges?: { label: string; count: number; variant: 'red' | 'teal' | 'muted' }[]
  grammarTip?: { title: string; example: string }
  wordOfDay?: { word: string; meaning: string }
}

const LANE_META: Record<LaneId, { label: string; href: string; ctaLabel: string }> = {
  session:      { label: 'ØKT',          href: '/session',      ctaLabel: 'Start økt' },
  conversation: { label: 'SAMTALE',      href: '/conversation', ctaLabel: 'Start samtale' },
  journal:      { label: 'SKRIVEJOURNAL', href: '/journal',      ctaLabel: 'Skriv i dag' },
  roleplay:     { label: 'ROLLESPILL',   href: '/roleplay',     ctaLabel: 'Start rollespill' },
  reading:      { label: 'LESESTUDIO',   href: '/reading',      ctaLabel: 'Les nå' },
}

const CONCEPT_TO_TOPIC: Record<string, string> = {
  'v2-word-order':         'daglig rutine',
  'present-tense-regular': 'daglig rutine',
  'negation':              'daglig rutine',
  'days-of-week':          'daglig rutine',
  'common-questions':      'daglig rutine',
  'noun-gender':           'mat og drikke',
  'indefinite-articles':   'mat og drikke',
  'basic-numbers':         'mat og drikke',
  'personal-pronouns':     'familie',
  'adjective-agreement':   'Norge',
  'common-prepositions':   'Norge',
  'preterite-regular':     'Norge',
  'common-modal-verbs':    'jobb',
}

const JOURNAL_PROMPTS = [
  'Beskriv din ideelle norske helg',
  'Hva liker du best med vinteren?',
  'Skriv om et sted du vil besøke i Norge',
  'Beskriv deg selv på norsk',
  'Hva er din favorittmat, og hvorfor?',
]

const DAILY_WORDS: { word: string; meaning: string }[] = [
  { word: 'hyggelig', meaning: 'cozy, pleasant' },
  { word: 'selvfølgelig', meaning: 'of course' },
  { word: 'egentlig', meaning: 'actually, really' },
  { word: 'forresten', meaning: 'by the way' },
  { word: 'likevel', meaning: 'nevertheless' },
  { word: 'kanskje', meaning: 'maybe, perhaps' },
  { word: 'heldigvis', meaning: 'fortunately' },
]

function isSaturday(): boolean {
  return new Date().getDay() === 6
}

function scoreLane(
  laneId: LaneId,
  fp: MistakeFingerprint,
  graph: ConceptGraph,
): number {
  const focusSet = new Set(fp.weeklyFocus)
  if (focusSet.size === 0) return laneId === 'session' ? 100 : 50

  switch (laneId) {
    case 'session': {
      const gaps = fp.weeklyFocus.reduce((sum, cid) => {
        const m = fp.conceptMastery[cid]
        return sum + (m ? Math.max(0, 80 - m.decayedScore) : 40)
      }, 0)
      return 100 + gaps
    }
    case 'conversation': {
      const topicMatch = fp.weeklyFocus.some((cid) => CONCEPT_TO_TOPIC[cid])
      return topicMatch ? 80 : 60
    }
    case 'journal':
      return 70
    case 'roleplay': {
      return 65
    }
    case 'reading': {
      const tagged = graph.concepts.filter((c) => focusSet.has(c.id)).length
      return 40 + tagged * 5
    }
    default:
      return 50
  }
}

function buildSessionRecommendation(
  fp: MistakeFingerprint,
  graph: ConceptGraph,
  plan: SchedulerOutput | null,
): CoachRecommendation {
  const primaryConcept = graph.concepts.find(
    (c) => c.id === (plan?.primaryFocus ?? fp.weeklyFocus[0] ?? 'noun-gender'),
  )
  const title = primaryConcept?.label ?? 'Norsk grunnlag'
  const itemCount = plan?.session.items.length ?? 9
  const minutes = Math.max(1, Math.ceil((itemCount * 45) / 60))
  const diagnosis = plan?.diagnosisResults?.[0] ?? null

  const badges: CoachRecommendation['compositionBadges'] = []
  if (plan) {
    const rem = plan.session.items.filter((i) => i.purpose === 'remediation').length
    const rev = plan.session.items.filter((i) => i.purpose === 'review').length
    const nw = plan.session.items.filter((i) => i.purpose === 'new-material').length
    if (rem > 0) badges.push({ label: 'reparasjon', count: rem, variant: 'red' })
    if (rev > 0) badges.push({ label: 'repetisjon', count: rev, variant: 'muted' })
    if (nw > 0) badges.push({ label: 'nytt', count: nw, variant: 'teal' })
  }

  return {
    laneId: 'session',
    ...LANE_META.session,
    title,
    subtitle: `${itemCount} oppgaver · ca. ${minutes} min`,
    reason: diagnosis?.reasoning ?? null,
    compositionBadges: badges.length > 0 ? badges : undefined,
    grammarTip: maybeGrammarTip(),
  }
}

function maybeGrammarTip(): CoachRecommendation['grammarTip'] | undefined {
  const dayIdx = new Date().getDay()
  if (dayIdx % 3 !== 0) return undefined
  const tips = [
    { title: 'V2-ordstilling', example: 'I morgen reiser jeg til Bergen.' },
    { title: 'Substantivkjønn', example: 'En mann og et barn gikk i parken.' },
    { title: 'Adjektivbøyning', example: 'Det store huset er rødt.' },
  ]
  return tips[dayIdx % tips.length]
}

function maybeWordOfDay(): CoachRecommendation['wordOfDay'] | undefined {
  const idx = new Date().getDate() % DAILY_WORDS.length
  return DAILY_WORDS[idx]
}

export function getCoachRecommendation(
  fp: MistakeFingerprint,
  graph: ConceptGraph,
  plan: SchedulerOutput | null,
): CoachRecommendation {
  if (isSaturday() && !allLanesDone()) {
    return {
      laneId: 'weekly-check',
      label: 'UKENS SJEKK',
      title: 'Ta ukens repetisjon',
      subtitle: `${fp.weeklyFocus.length} fokuskonsepter testes`,
      reason: 'Ukentlig sjekk — vis hva du har lært denne uken.',
      href: '/uke',
      ctaLabel: 'Start sjekk',
    }
  }

  if (allLanesDone()) {
    return {
      laneId: 'celebration',
      label: 'FERDIG',
      title: 'Bra jobba!',
      subtitle: 'Alle baner fullført i dag',
      reason: null,
      href: '/progress',
      ctaLabel: 'Se fremgang',
    }
  }

  const completed = getCompletedLanes()
  const candidates = (['session', 'conversation', 'journal', 'roleplay', 'reading'] as LaneId[])
    .filter((l) => !completed.has(l))

  if (candidates.length === 0) {
    return {
      laneId: 'celebration',
      label: 'FERDIG',
      title: 'Bra jobba!',
      subtitle: 'Alle baner fullført i dag',
      reason: null,
      href: '/progress',
      ctaLabel: 'Se fremgang',
    }
  }

  const scored = candidates
    .map((l) => ({ laneId: l, score: scoreLane(l, fp, graph) }))
    .sort((a, b) => b.score - a.score)

  const best = scored[0].laneId

  if (best === 'session') {
    return buildSessionRecommendation(fp, graph, plan)
  }

  const meta = LANE_META[best]
  const focusConcept = fp.weeklyFocus[0]
  const focusLabel = graph.concepts.find((c) => c.id === focusConcept)?.label

  const extras: Partial<CoachRecommendation> = {}

  switch (best) {
    case 'conversation': {
      const topic = focusConcept ? (CONCEPT_TO_TOPIC[focusConcept] ?? 'daglig rutine') : 'daglig rutine'
      return {
        ...meta, laneId: best,
        title: 'Snakk med Kari',
        subtitle: `Foreslått tema: ${topic}`,
        reason: focusLabel ? `Øv på ${focusLabel} gjennom samtale.` : null,
        ...extras,
      }
    }
    case 'journal': {
      const prompt = JOURNAL_PROMPTS[new Date().getDay() % JOURNAL_PROMPTS.length]
      return {
        ...meta, laneId: best,
        title: prompt.length > 40 ? prompt.slice(0, 40) + '…' : prompt,
        subtitle: focusLabel ? `Ukens fokus: ${focusLabel}` : 'Skriv fritt på norsk',
        reason: 'Skriving styrker produksjonsferdigheter.',
        wordOfDay: maybeWordOfDay(),
      }
    }
    case 'roleplay':
      return {
        ...meta, laneId: best,
        title: 'Øv med rollespill',
        subtitle: focusLabel ? `Anbefalt scenario for ${focusLabel}` : '3 scenarier tilgjengelig',
        reason: focusLabel ? `Scenariet matcher ukens fokus: ${focusLabel}.` : null,
      }
    case 'reading':
      return {
        ...meta, laneId: best,
        title: 'Les på norsk',
        subtitle: `Tekster på ditt ${fp.currentLevel}-nivå`,
        reason: 'Lesing gir eksponering mot ukens konsepter.',
        wordOfDay: maybeWordOfDay(),
      }
    default:
      return {
        ...meta, laneId: best,
        title: meta.ctaLabel,
        subtitle: '',
        reason: null,
      }
  }
}
