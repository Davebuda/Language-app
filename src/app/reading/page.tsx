'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { BottomNav } from '@/components/layout/BottomNav'
import { useFingerprint } from '@/hooks/useFingerprint'
import { markLaneDone } from '@/lib/lane-completion'

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

const CEFR_COLORS: Record<CEFRLevel, string> = {
  A1: 'bg-emerald-400/15 text-emerald-400',
  A2: 'bg-sky-400/15 text-sky-400',
  B1: 'bg-violet-400/15 text-violet-400',
  B2: 'bg-amber-400/15 text-amber-400',
}

export default function ReadingPage() {
  const [selectedText, setSelectedText] = useState<SeedText | null>(null)
  const [filterLevel, setFilterLevel] = useState<CEFRLevel | 'all'>('all')
  const [showParallel, setShowParallel] = useState(false)
  const [tappedWord, setTappedWord] = useState<string | null>(null)
  const { recordExposure } = useFingerprint()

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
    setTappedWord(clean || null)
  }

  return (
    <div className="nc-gradient-page flex min-h-dvh flex-col">
      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-5 pb-24 pt-5">
        <AnimatePresence mode="wait">
          {!selectedText ? (
            <motion.div
              key="library"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              {/* Header */}
              <div className="nc-glass-cream p-5">
                <div className="nc-label">Leseflate</div>
                <h1 className="mt-2 text-[2rem] font-extrabold text-[var(--nc-cream-text)]">Lesestudio</h1>
                <p className="mt-2 text-[0.95rem] leading-7 text-[var(--nc-cream-muted)]">
                  Les norsk tekst på ditt nivå. Hver eksponering kan støtte de samme konseptene som øktene dine.
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex gap-2 flex-wrap">
                {(['all', 'A1', 'A2'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setFilterLevel(lvl)}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors ${
                      filterLevel === lvl
                        ? 'bg-[var(--nc-red-tint)] text-[var(--nc-red)] border-[var(--nc-red-border)]'
                        : 'nc-glass text-[var(--nc-text-muted)] hover:text-[var(--nc-text)]'
                    }`}
                  >
                    {lvl === 'all' ? 'Alle' : lvl}
                  </button>
                ))}
              </div>

              {/* Text cards */}
              <div className="flex flex-col gap-3">
                {filtered.map((text, i) => (
                  <motion.button
                    key={text.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => { setSelectedText(text); setTappedWord(null); setShowParallel(false) }}
                    className="w-full text-left nc-glass-cream rounded-2xl p-4 hover:border-[var(--nc-red-border)] transition-colors active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[15px] font-bold text-[var(--nc-cream-text)]">{text.title}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${CEFR_COLORS[text.cefrLevel]}`}>
                        {text.cefrLevel}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[11px] text-[var(--nc-cream-muted)]">{GENRE_LABELS[text.genre]}</span>
                      <span className="text-[var(--nc-cream-dim)]">·</span>
                      <span className="text-[11px] text-[var(--nc-cream-muted)]">~{text.estimatedMinutes} min</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={selectedText.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={closeText}
                  className="nc-glass flex size-10 items-center justify-center text-[var(--nc-text-muted)] hover:text-[var(--nc-text)] transition-colors"
                  aria-label="Tilbake"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setShowParallel((v) => !v)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                    showParallel
                      ? 'bg-[var(--nc-red-tint)] border-[var(--nc-red-border)] text-[var(--nc-red)]'
                      : 'nc-glass text-[var(--nc-text-muted)]'
                  }`}
                >
                  {showParallel ? 'Norsk' : 'Vis engelsk'}
                </button>
              </div>

              {/* Title block */}
              <div>
                <h1 className="font-display text-xl font-bold text-[var(--nc-text)]">{selectedText.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CEFR_COLORS[selectedText.cefrLevel]}`}>
                    {selectedText.cefrLevel}
                  </span>
                  <span className="text-[11px] text-[var(--nc-text-muted)]">{GENRE_LABELS[selectedText.genre]}</span>
                </div>
              </div>

              {/* Text content */}
              <div className={showParallel ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
                <div className="nc-glass-elevated p-5 md:p-7">
                  {showParallel && (
                    <div className="mb-2 text-[10px] uppercase tracking-widest text-[var(--nc-text-dim)]">Norsk</div>
                  )}
                  <p className="text-[16px] leading-8 text-[var(--nc-text-muted)]">
                    {selectedText.content.split('\n').map((line, i) => (
                      <span key={i}>
                        {line.split(' ').map((word, j) => (
                          <span
                            key={j}
                            onClick={() => handleWordTap(word)}
                            className="cursor-pointer hover:text-[var(--nc-red)] rounded px-0.5 transition-colors"
                          >
                            {word}{' '}
                          </span>
                        ))}
                        {i < selectedText.content.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                </div>

                {showParallel && (
                  <div className="nc-glass-elevated p-5 md:p-7">
                    <div className="mb-2 text-[10px] uppercase tracking-widest text-[var(--nc-text-dim)]">Engelsk</div>
                    <p className="text-[15px] leading-8 text-[var(--nc-text-muted)]">
                      {selectedText.contentEn}
                    </p>
                  </div>
                )}
              </div>

              {/* Word lookup tooltip */}
              <AnimatePresence>
                {tappedWord && (
                  <motion.div
                    key={tappedWord}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="nc-glass p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-bold text-[var(--nc-text)]">{tappedWord}</span>
                      <button
                        onClick={() => setTappedWord(null)}
                        className="text-[var(--nc-text-dim)] text-[12px] hover:text-[var(--nc-text)] transition-colors"
                        aria-label="Lukk"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="mt-1 text-[12px] text-[var(--nc-text-muted)]">Ordoppslag kommer snart</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={closeText}
                className="nc-button-primary w-full rounded-xl py-3 text-sm font-extrabold transition-transform active:scale-[0.98]"
              >
                Ferdig lesing ✓
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
