'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, BookOpen, Clock } from 'lucide-react'
import { BottomNav } from '@/components/layout/BottomNav'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useNotebook } from '@/hooks/useNotebook'
import { resolveWordExplanation } from '@/lib/word-explanation'
import { getReadingContentLevel, isBelowReadingLevel } from '@/lib/reading-content'
import { wordState } from '@/lib/word-state'
import { markLaneDone } from '@/lib/lane-completion'
import { useToastStore } from '@/stores/toast-store'

type Genre = 'story' | 'dialogue' | 'recipe' | 'news'
type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2'

interface SeedText {
  id: string
  title: string
  genre: Genre
  cefrLevel: CEFRLevel
  estimatedMinutes: number
  content: string
  contentEn: string
  conceptIds: string[]  // concepts this text exposes — verified against a1/a2-graph.json
}

const SEED_TEXTS: SeedText[] = [
  {
    id: '1',
    title: 'En dag i Oslo',
    genre: 'story',
    cefrLevel: 'A1',
    estimatedMinutes: 3,
    conceptIds: ['v2-word-order', 'common-prepositions', 'present-tense-regular'],
    content: 'Kari bor i Oslo. Hun jobber på et kontor i sentrum. Om morgenen tar hun T-banen til jobb. Hun drikker kaffe og leser avisen på toget. Kollegene hennes er hyggelige. Om ettermiddagen går hun en tur i parken. Hun liker å se på fuglene og trærne. Om kvelden lager hun middag hjemme. Hun spiser pasta med tomatsaus. Etter middag ser hun på TV og slapper av. Det er en god dag.',
    contentEn: 'Kari lives in Oslo. She works at an office in the city centre. In the morning she takes the metro to work. She drinks coffee and reads the newspaper on the train. Her colleagues are friendly. In the afternoon she takes a walk in the park. She likes watching the birds and trees. In the evening she cooks dinner at home. She eats pasta with tomato sauce. After dinner she watches TV and relaxes. It is a good day.',
  },
  {
    id: '2',
    title: 'På kafeen',
    genre: 'dialogue',
    cefrLevel: 'A1',
    estimatedMinutes: 2,
    conceptIds: ['question-formation', 'common-modal-verbs', 'noun-gender'],
    content: '— Hei! Hva kan jeg hjelpe deg med?\n— Hei! Jeg vil gjerne ha en kaffe, takk.\n— Vil du ha melk i kaffen?\n— Ja, takk. Og et stykke kake, hvis dere har det.\n— Selvfølgelig! Vi har sjokoladekake og bringebærkake.\n— Sjokoladekake, takk. Hva koster det?\n— Det koster åtti kroner til sammen.\n— Her er et hundrekronestykke.\n— Og her er vekselen. Ha en fin dag!\n— Takk, i like måte!',
    contentEn: '— Hi! What can I help you with?\n— Hi! I\'d like a coffee, please.\n— Would you like milk in your coffee?\n— Yes please. And a piece of cake, if you have it.\n— Of course! We have chocolate cake and raspberry cake.\n— Chocolate cake, please. How much does it cost?\n— It\'s eighty kroner in total.\n— Here\'s a hundred-krone coin.\n— And here\'s the change. Have a nice day!\n— Thanks, you too!',
  },
  {
    id: '3',
    title: 'Friluftsliv',
    genre: 'story',
    cefrLevel: 'A2',
    estimatedMinutes: 4,
    conceptIds: ['word-formation', 'definite-articles-singular', 'v2-word-order'],
    content: 'Nordmenn elsker naturen. De har et ord for det: friluftsliv. Det betyr "liv i friluft" — å tilbringe tid utendørs. Om sommeren går mange på fjellturer eller svømmer i innsjøer. Om vinteren er det populært å gå på ski. Mange familier har en hytte på fjellet eller ved sjøen. De reiser dit i helgene og i ferien. Der kan de vandre, fiske og nyte naturen. Friluftsliv er mer enn en hobby — det er en del av den norske identiteten.',
    contentEn: 'Norwegians love nature. They have a word for it: friluftsliv. It means "life in the open air" — spending time outdoors. In summer, many go on mountain hikes or swim in lakes. In winter, skiing is popular. Many families have a cabin in the mountains or by the sea. They go there on weekends and during holidays. There they can hike, fish and enjoy nature. Friluftsliv is more than a hobby — it is part of Norwegian identity.',
  },
  {
    id: '4',
    title: 'Norsk mat',
    genre: 'story',
    cefrLevel: 'A2',
    estimatedMinutes: 3,
    conceptIds: ['noun-gender', 'common-prepositions', 'word-formation'],
    content: 'Norsk mat er enkel og god. Til frokost spiser mange brød med smør og pålegg. Populære pålegg er ost, skinke og makrell i tomat. Noen spiser havregrøt med bær og honning. Til lunsj er det vanlig med matpakke — brødskiver som man tar med på jobb eller skole. Til middag er det gjerne kjøtt eller fisk med poteter og grønnsaker. Laks er veldig populær i Norge. En klassisk norsk rett er fårikål — lam og kål kokt sammen.',
    contentEn: 'Norwegian food is simple and good. For breakfast, many eat bread with butter and toppings. Popular toppings are cheese, ham and mackerel in tomato. Some eat oatmeal with berries and honey. For lunch, it is common to have a packed lunch — bread slices brought to work or school. For dinner, it is usually meat or fish with potatoes and vegetables. Salmon is very popular in Norway. A classic Norwegian dish is fårikål — lamb and cabbage cooked together.',
  },
]

const GENRE_LABELS: Record<Genre, string> = {
  story: 'Fortelling',
  dialogue: 'Dialog',
  recipe: 'Oppskrift',
  news: 'Nyheter',
}

// Green-led coherent CEFR badge set: signal green leads, neutral tints for others
const CEFR_COLORS: Record<CEFRLevel, string> = {
  A1: 'bg-[var(--nc-signal-tint)] text-[var(--nc-signal)] border border-[color-mix(in_srgb,var(--nc-signal)_18%,transparent)]',
  A2: 'bg-[rgba(255,255,255,0.08)] text-[var(--nc-text-muted)] border border-[var(--nc-border)]',
  B1: 'bg-[rgba(255,255,255,0.06)] text-[var(--nc-text-dim)] border border-[var(--nc-border)]',
  B2: 'bg-[rgba(255,255,255,0.06)] text-[var(--nc-text-dim)] border border-[var(--nc-border)]',
}

// Cream-context CEFR colors (used inside the reader panel)
const CEFR_COLORS_CREAM: Record<CEFRLevel, string> = {
  A1: 'bg-[var(--nc-signal-tint)] text-[var(--nc-signal-ink-deep)] border border-[var(--nc-signal-border)]',
  A2: 'bg-[rgba(17,21,24,0.07)] text-[var(--nc-cream-muted)] border border-[rgba(17,21,24,0.10)]',
  B1: 'bg-[rgba(17,21,24,0.05)] text-[var(--nc-cream-dim)] border border-[rgba(17,21,24,0.08)]',
  B2: 'bg-[rgba(17,21,24,0.05)] text-[var(--nc-cream-dim)] border border-[rgba(17,21,24,0.08)]',
}

export default function ReadingPage() {
  const [selectedText, setSelectedText] = useState<SeedText | null>(null)
  const [filterLevel, setFilterLevel] = useState<CEFRLevel | 'all'>('all')
  const [showParallel, setShowParallel] = useState(false)
  const [tappedWord, setTappedWord] = useState<string | null>(null)
  const [savedWord, setSavedWord] = useState<string | null>(null)
  const { fingerprint, recordExposure } = useFingerprint()
  const { items, saveItem, updateItem } = useNotebook()
  const showToast = useToastStore((s) => s.showToast)

  // Honest disclosure (Rule 6 — R-02): the seed library is A1–A2 only, so a
  // B1/B2 learner reads below their level. Surface that instead of silently
  // substituting, mirroring roleplay/listen.
  const currentLevel = fingerprint?.currentLevel ?? 'A1'
  const readingContentLevel = getReadingContentLevel(currentLevel)
  const isBelowLevel = isBelowReadingLevel(currentLevel)

  // Verified-first, honest-empty resolution for the tapped word. A free reading
  // word has no errorTag/conceptId, so this resolves to a corpus gloss/rule when
  // the word is in the vocab corpus, else the honest 'none' source (AI-01: never
  // fabricate a translation).
  const explanation = useMemo(
    () => (tappedWord ? resolveWordExplanation({ text: tappedWord }) : null),
    [tappedWord],
  )

  function closeText() {
    if (selectedText) {
      recordExposure(selectedText.conceptIds)
      markLaneDone('reading')
    }
    setSelectedText(null)
  }

  const filtered = filterLevel === 'all' ? SEED_TEXTS : SEED_TEXTS.filter((t) => t.cefrLevel === filterLevel)

  function handleWordTap(word: string) {
    const clean = word.replace(/[^\wÀ-ſ]/g, '')
    setSavedWord(null)
    setTappedWord(clean || null)
  }

  function handleSaveWord() {
    if (!tappedWord || !explanation || !selectedText) return
    if (savedWord === tappedWord) return // guard against double-save
    saveItem({
      type: 'word',
      norwegian: tappedWord,
      ...(explanation.verified?.english ? { english: explanation.verified.english } : {}),
      ...(explanation.verified?.rule ? { explanation: explanation.verified.rule } : {}),
      source: 'reading',
      // Tag the originating passage so the contextual-practice CTA can scope
      // "words from THIS text" precisely (Task 2).
      sourceSentence: selectedText.title,
      verified: explanation.source === 'corpus',
    })
    setSavedWord(tappedWord)
  }

  // The notebook items the learner saved from THE CURRENT passage that can ACTUALLY
  // be promoted into the økt. The scheduler injects a promoted notebook item as a
  // translation-to-norwegian exercise ONLY when it has BOTH norwegian AND english
  // (english is the prompt) — so an item without english would be silently dropped.
  // We therefore scope the CTA to items that will genuinely come back: saved from
  // reading, belonging to this passage, with an english gloss. This keeps the CTA
  // HONEST (Rule 8) — it never promises practice that the engine would drop.
  const practiceableFromText = useMemo(() => {
    if (!selectedText) return []
    return items.filter(
      (it) =>
        it.source === 'reading' &&
        it.sourceSentence === selectedText.title &&
        it.reviewStatus !== 'archived' &&
        (it.english ?? '').trim().length > 0,
    )
  }, [items, selectedText])

  const alreadyPromotedCount = practiceableFromText.filter((it) => it.promoted).length

  function handlePracticeFromText() {
    if (practiceableFromText.length === 0) return
    // Reuse the EXISTING promotion path (updateItem → promoted:true), the same
    // mechanism NotebookScreen's "Øv på dette" uses. getEligibleNotebookItems
    // then admits these into the daily økt's new-material lane (T1.6-safe).
    let promotedNow = 0
    for (const it of practiceableFromText) {
      if (it.promoted) continue
      updateItem(it.id, { promoted: true })
      promotedNow += 1
    }
    const total = practiceableFromText.length
    showToast(
      promotedNow > 0
        ? `${total} ${total === 1 ? 'ord' : 'ord'} fra teksten kommer tilbake i økta`
        : 'Ordene fra teksten er allerede i økta',
    )
  }

  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell nc-flow-shell">
        <AnimatePresence mode="wait">
          {!selectedText ? (
            <motion.div
              key="library"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-[6px]"
            >
              {/* ── Hero (Lime focal panel) ── */}
              <div className="nc-signal-panel p-3">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Leseflate</div>
                <h1 className="mt-1 text-balance text-[1.25rem] font-extrabold leading-none text-[var(--nc-signal-fg)]">
                  Lesestudio
                </h1>
                <p className="mt-1 text-[0.78rem] leading-5 text-[rgba(10,18,6,0.62)]">
                  Norsk tekst på ditt nivå.
                </p>
              </div>

              {/* ── Honest below-level disclosure (Rule 6 — R-02; no silent substitution) ── */}
              {isBelowLevel ? (
                <div className="rounded-lg border border-[var(--nc-border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[10px] leading-snug text-[var(--nc-text-dim)]">
                  Tekstene er på {readingContentLevel}-nivå — egne {currentLevel}-tekster kommer.
                </div>
              ) : null}

              {/* ── Filter pills (Dark strip) ── */}
              <div className="flex items-center gap-[6px] rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] px-2 py-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--nc-text-dim)]">Nivå</span>
                <div className="flex gap-1.5 flex-wrap">
                  {(['all', 'A1', 'A2'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setFilterLevel(lvl)}
                      aria-label={`Filter: ${lvl === 'all' ? 'Alle nivåer' : lvl}`}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-colors ${
                        filterLevel === lvl
                          ? 'bg-[var(--nc-signal-tint)] text-[var(--nc-signal)] border-[var(--nc-signal-border)]'
                          : 'bg-transparent text-[var(--nc-text-muted)] border-[var(--nc-border)] hover:text-[var(--nc-text)]'
                      }`}
                    >
                      {lvl === 'all' ? 'Alle' : lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Text cards (Cream panel) ── */}
              <div className="nc-glass-cream rounded-lg overflow-hidden">
                <div className="border-b border-[rgba(17,21,24,0.06)] px-2.5 py-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
                    {filtered.length} tekster
                  </span>
                </div>
                <div className="flex flex-col divide-y divide-[rgba(17,21,24,0.06)]">
                  {filtered.map((text, i) => (
                    <motion.button
                      key={text.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => { setSelectedText(text); setTappedWord(null); setShowParallel(false) }}
                      className="w-full text-left px-2.5 py-2.5 hover:bg-[rgba(17,21,24,0.03)] active:bg-[rgba(17,21,24,0.06)] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[0.88rem] font-bold leading-tight text-[var(--nc-cream-text)]">
                          {text.title}
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${CEFR_COLORS_CREAM[text.cefrLevel]}`}>
                          {text.cefrLevel}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <BookOpen size={10} className="text-[var(--nc-cream-dim)]" aria-hidden="true" />
                        <span className="text-[10px] text-[var(--nc-cream-muted)]">{GENRE_LABELS[text.genre]}</span>
                        <span className="text-[var(--nc-cream-dim)]">·</span>
                        <Clock size={10} className="text-[var(--nc-cream-dim)]" aria-hidden="true" />
                        <span className="text-[10px] tabular-nums text-[var(--nc-cream-muted)]">~{text.estimatedMinutes} min</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={selectedText.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-[6px]"
            >
              {/* ── Reader nav bar (Dark) ── */}
              <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] px-2 py-1.5">
                <button
                  onClick={closeText}
                  className="flex size-8 items-center justify-center rounded-[0.35rem] text-[var(--nc-text-muted)] hover:text-[var(--nc-text)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                  aria-label="Tilbake til tekstliste"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="truncate text-[0.8rem] font-bold text-[var(--nc-text)]">{selectedText.title}</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold ${CEFR_COLORS[selectedText.cefrLevel]}`}>
                    {selectedText.cefrLevel}
                  </span>
                </div>

                <button
                  onClick={() => setShowParallel((v) => !v)}
                  aria-label={showParallel ? 'Vis kun norsk' : 'Vis engelsk parallelt'}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                    showParallel
                      ? 'bg-[var(--nc-signal-tint)] border-[var(--nc-signal-border)] text-[var(--nc-signal)]'
                      : 'bg-transparent border-[var(--nc-border)] text-[var(--nc-text-muted)]'
                  }`}
                >
                  {showParallel ? 'Norsk' : 'Vis engelsk'}
                </button>
              </div>

              {/* ── Concept strip (Dark micro bar) ── */}
              <div className="flex items-center gap-1.5 rounded-md bg-[var(--nc-card)] border border-[var(--nc-border)] px-2 py-1.5 overflow-x-auto">
                <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--nc-text-dim)]">Konsepter</span>
                {selectedText.conceptIds.slice(0, 3).map((cid) => (
                  <span
                    key={cid}
                    className="shrink-0 rounded-[0.2rem] bg-[var(--nc-signal-tint)] border border-[color-mix(in_srgb,var(--nc-signal)_14%,transparent)] px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.06em] text-[var(--nc-signal)]"
                  >
                    {cid.replace(/-/g, ' ')}
                  </span>
                ))}
                <div className="flex shrink-0 items-center gap-1 ml-auto">
                  <Clock size={9} className="text-[var(--nc-text-dim)]" aria-hidden="true" />
                  <span className="text-[9px] tabular-nums text-[var(--nc-text-dim)]">~{selectedText.estimatedMinutes} min</span>
                </div>
              </div>

              {/* ── Text content (Cream "paper" surface) ── */}
              <div className={showParallel ? 'grid grid-cols-1 gap-[6px]' : ''}>
                <div className="nc-surface p-4">
                  {showParallel && (
                    <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Norsk</div>
                  )}
                  <p className="text-[0.9rem] leading-[1.85] text-[var(--nc-cream-text)]">
                    {selectedText.content.split('\n').map((line, i) => (
                      <span key={i}>
                        {line.split(' ').map((word, j) => {
                          const clean = word.replace(/[^\wÀ-ſ]/g, '')
                          // LingQ-style state tint from the learner's notebook
                          // (cream-context palette; the reader is a cream surface).
                          const stateClass = clean
                            ? `nc-word--${wordState(clean, items)}`
                            : ''
                          const isTapped = clean !== '' && tappedWord === clean
                          return (
                            <span
                              key={j}
                              onClick={() => handleWordTap(word)}
                              className={`${stateClass} cursor-pointer rounded px-px transition-colors hover:bg-[color-mix(in_srgb,var(--nc-signal)_18%,transparent)] ${
                                isTapped ? 'bg-[color-mix(in_srgb,var(--nc-cyan)_14%,transparent)]' : ''
                              }`}
                            >
                              {word}{' '}
                            </span>
                          )
                        })}
                        {i < selectedText.content.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                </div>

                {showParallel && (
                  <div className="nc-glass rounded-lg p-4">
                    <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">Engelsk</div>
                    <p className="text-[0.85rem] leading-[1.85] text-[var(--nc-text-muted)] text-pretty">
                      {selectedText.contentEn}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Word lookup (Dark card) ── */}
              <AnimatePresence>
                {tappedWord && (
                  <motion.div
                    key={tappedWord}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="nc-glass rounded-lg p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[1.05rem] font-extrabold leading-tight text-[var(--nc-text)]">{tappedWord}</span>
                      <button
                        onClick={() => { setTappedWord(null); setSavedWord(null) }}
                        className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--nc-border)] text-[var(--nc-text-dim)] hover:text-[var(--nc-text)] transition-colors"
                        aria-label="Lukk ordoppslag"
                      >
                        <span aria-hidden="true" className="text-[11px] leading-none">✕</span>
                      </button>
                    </div>

                    {explanation && (explanation.verified?.english || explanation.verified?.rule) ? (
                      <div className="mt-1.5 flex flex-col gap-1">
                        {explanation.verified?.english && (
                          <p className="text-[0.82rem] font-semibold text-[var(--nc-text)]">{explanation.verified.english}</p>
                        )}
                        {explanation.verified?.rule && (
                          <p className="text-[0.72rem] leading-snug text-[var(--nc-text-muted)]">{explanation.verified.rule}</p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[0.75rem] text-[var(--nc-text-dim)]">Ingen oppslag ennå</p>
                    )}

                    <button
                      onClick={handleSaveWord}
                      disabled={savedWord === tappedWord}
                      className="mt-2.5 w-full rounded-lg border border-[var(--nc-signal-border)] bg-[var(--nc-signal-tint)] px-3 py-2 text-[0.72rem] font-bold text-[var(--nc-signal)] transition-colors hover:bg-[color-mix(in_srgb,var(--nc-signal)_22%,transparent)] disabled:opacity-70"
                    >
                      {savedWord === tappedWord ? 'Lagret ✓' : 'Lagre i notatboka'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Contextual practice CTA (Task 2) ──
                  Promotes the words saved from THIS text into the økt via the
                  existing promotion path. Honest disabled state when nothing
                  promotable yet — never a dead button (Rule 8). */}
              {practiceableFromText.length > 0 ? (
                <button
                  onClick={handlePracticeFromText}
                  disabled={alreadyPromotedCount === practiceableFromText.length}
                  className="nc-button-primary w-full rounded-xl py-3 text-[0.82rem] font-extrabold disabled:opacity-70"
                >
                  {alreadyPromotedCount === practiceableFromText.length
                    ? `Ordene fra teksten øves (${practiceableFromText.length}) ✓`
                    : `Øv ordene fra teksten (${practiceableFromText.length})`}
                </button>
              ) : (
                <div className="nc-glass rounded-xl px-3.5 py-3 text-center">
                  <p className="text-[0.78rem] font-bold text-[var(--nc-text-muted)]">
                    Lagre ord fra teksten først
                  </p>
                  <p className="mt-0.5 text-[0.7rem] leading-[1.4] text-[var(--nc-text-dim)]">
                    Trykk på et ord, lagre det med en oversettelse — så kan du øve
                    på det i økta.
                  </p>
                </div>
              )}

              <button
                onClick={closeText}
                className="nc-button-dark w-full rounded-xl py-3 text-[0.82rem] font-extrabold"
              >
                Ferdig lesing
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav active="snakk" />
    </div>
  )
}
