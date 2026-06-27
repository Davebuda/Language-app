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
  // Tier 2 B1/B2 library (2026-06-28, linguist-reviewed; b1-dugnad proverb + b2-ki
  // English translation corrected before wiring). conceptIds verified vs b1/b2-graph.
  {
    id: 'b1-flytte',
    title: 'Da jeg kom til Norge',
    genre: 'story',
    cefrLevel: 'B1',
    estimatedMinutes: 4,
    conceptIds: ['past-perfect', 'complex-subordination', 'discourse-markers'],
    content: 'Da jeg kom til Norge for tre år siden, kunne jeg ikke et ord norsk. Jeg hadde lært litt engelsk på skolen, men norsk var helt nytt for meg. De første månedene var vanskelige. Jeg forsto nesten ingenting når folk snakket, og jeg turte nesten ikke å si noe. Men jeg bestemte meg for ikke å gi opp. Hver dag leste jeg en kort tekst, og hver kveld så jeg på norsk TV med teksting. Etter hvert begynte jeg å forstå mer. Det som hjalp meg mest, var å snakke med naboene mine. Selv om jeg gjorde mange feil, ble de aldri irriterte. I dag kan jeg føre en hel samtale på norsk, og jeg er stolt av det jeg har lært.',
    contentEn: "When I came to Norway three years ago, I didn't know a word of Norwegian. I had learned a little English at school, but Norwegian was completely new to me. The first months were difficult. I understood almost nothing when people spoke, and I hardly dared to say anything. But I decided not to give up. Every day I read a short text, and every evening I watched Norwegian TV with subtitles. Gradually I began to understand more. What helped me most was talking with my neighbours. Even though I made many mistakes, they never got annoyed. Today I can hold a whole conversation in Norwegian, and I'm proud of what I've learned.",
  },
  {
    id: 'b1-jobb',
    title: 'Å søke jobb i Norge',
    genre: 'news',
    cefrLevel: 'B1',
    estimatedMinutes: 4,
    conceptIds: ['s-passive-vs-bli-passive', 'phrasal-verbs', 'formal-informal-register'],
    content: 'Å finne en jobb i Norge kan ta tid, men det finnes mange muligheter. De fleste stillinger lyses ut på nettet, for eksempel på finn.no eller nav.no. Når du har funnet en interessant stilling, må du skrive en søknad og en CV. I søknaden bør du fortelle hvorfor du passer til jobben. Det er vanlig at arbeidsgiveren kaller inn de beste kandidatene til et intervju. På intervjuet blir du gjerne spurt om erfaringen din og hvorfor du vil jobbe der. Det lønner seg å forberede seg godt. Husk også at mange jobber blir besatt gjennom nettverk, så det kan være lurt å bli kjent med folk i bransjen.',
    contentEn: 'Finding a job in Norway can take time, but there are many opportunities. Most positions are advertised online, for example on finn.no or nav.no. Once you have found an interesting position, you have to write an application and a CV. In the application you should explain why you are a good fit for the job. It is common for the employer to call in the best candidates for an interview. At the interview you are usually asked about your experience and why you want to work there. It pays to prepare well. Also remember that many jobs are filled through networks, so it can be wise to get to know people in the industry.',
  },
  {
    id: 'b1-dugnad',
    title: 'Dugnad',
    genre: 'story',
    cefrLevel: 'B1',
    estimatedMinutes: 4,
    conceptIds: ['cleft-sentences', 'complex-subordination', 'idiomatic-expressions'],
    content: 'Et typisk norsk ord er «dugnad». En dugnad er når en gruppe mennesker jobber sammen frivillig for å få gjort noe, uten å få betalt. Det kan være å male et hus, rydde i nabolaget eller arrangere et loppemarked. Det som gjør dugnaden spesiell, er fellesskapet. Folk møtes, jobber sammen og spiser gjerne vafler etterpå. Mange borettslag har dugnad om våren, der alle hjelper til med å rydde uteområdene. Selv om ikke alle synes det er like gøy, forstår de fleste at det er viktig å stille opp. Som man sier på norsk: mange hender gjør arbeidet lett.',
    contentEn: 'A typical Norwegian word is "dugnad". A dugnad is when a group of people work together voluntarily to get something done, without being paid. It can be painting a house, tidying up the neighbourhood or organising a flea market. What makes the dugnad special is the sense of community. People meet, work together and often eat waffles afterwards. Many housing cooperatives have a dugnad in spring, where everyone helps tidy the outdoor areas. Even though not everyone finds it equally fun, most understand that it\'s important to pitch in. As the Norwegian saying goes: many hands make light work.',
  },
  {
    id: 'b1-misforstaelse',
    title: 'En misforståelse',
    genre: 'dialogue',
    cefrLevel: 'B1',
    estimatedMinutes: 3,
    conceptIds: ['indirect-questions', 'phrasal-verbs', 'discourse-markers'],
    content: '— Hei, jeg lurer på om du kan hjelpe meg med noe.\n— Ja, så klart. Hva gjelder det?\n— Jeg fikk en regning i posten, men jeg skjønner ikke hva den er for.\n— La meg se på den. Å, dette er fakturaen for treningssenteret.\n— Men jeg meldte meg jo ut for to måneder siden!\n— Det stemmer ikke helt med det jeg ser her. Vet du om du fikk en bekreftelse?\n— Nei, jeg er ikke sikker på om jeg fikk noe svar.\n— Da bør du ta kontakt med dem og finne ut hva som har skjedd.\n— Du har rett. Jeg ringer dem med en gang. Tusen takk for hjelpen!',
    contentEn: "— Hi, I wonder if you can help me with something.\n— Yes, of course. What's it about?\n— I got a bill in the mail, but I don't understand what it's for.\n— Let me look at it. Oh, this is the invoice for the gym.\n— But I cancelled my membership two months ago!\n— That doesn't quite match what I see here. Do you know if you got a confirmation?\n— No, I'm not sure if I got any reply.\n— Then you should get in touch with them and find out what happened.\n— You're right. I'll call them right away. Thank you so much for the help!",
  },
  {
    id: 'b2-janteloven',
    title: 'Janteloven',
    genre: 'news',
    cefrLevel: 'B2',
    estimatedMinutes: 5,
    conceptIds: ['nuanced-register', 'complex-argumentation', 'text-cohesion'],
    content: 'Janteloven er et begrep som mange forbinder med skandinavisk kultur. Den stammer fra en roman av Aksel Sandemose og beskriver en uskreven regel om at man ikke skal tro at man er noe bedre enn andre. På den ene siden kan denne tankegangen fremme likhet og beskjedenhet, verdier som står sterkt i Norge. På den andre siden hevder kritikere at den kan hindre folk i å skille seg ut og være stolte av det de får til. I dag er det imidlertid mange som mener at Janteloven er på vei ut. Yngre generasjoner er mer opptatt av individuell suksess enn før. Likevel lever idealet om likhet videre, om enn i en mer moderne form.',
    contentEn: 'The Law of Jante is a concept that many associate with Scandinavian culture. It originates from a novel by Aksel Sandemose and describes an unwritten rule that you should not think you are any better than others. On the one hand, this mindset can promote equality and modesty, values that are strong in Norway. On the other hand, critics argue that it can prevent people from standing out and being proud of what they achieve. Today, however, many believe that the Law of Jante is on its way out. Younger generations are more concerned with individual success than before. Still, the ideal of equality lives on, albeit in a more modern form.',
  },
  {
    id: 'b2-klima',
    title: 'Klima og hverdagen',
    genre: 'news',
    cefrLevel: 'B2',
    estimatedMinutes: 5,
    conceptIds: ['advanced-passive', 'complex-argumentation', 'advanced-verb-forms'],
    content: 'Klimaendringene er en av vår tids største utfordringer, og spørsmålet om hva den enkelte kan gjøre, blir stadig oftere diskutert. Noen mener at ansvaret først og fremst ligger hos politikerne og de store selskapene. Andre argumenterer for at også vanlige folk må endre vanene sine. Hadde alle kuttet ned på kjøttforbruket og kjørt mindre bil, ville utslippene blitt betydelig lavere. Samtidig er det viktig å huske at de fattigste landene rammes hardest, selv om de har bidratt minst til problemet. Mange eksperter understreker derfor at løsningen må være rettferdig. Det nytter lite å innføre tiltak som bare de rikeste har råd til.',
    contentEn: 'Climate change is one of the greatest challenges of our time, and the question of what the individual can do is discussed more and more often. Some believe that the responsibility lies first and foremost with the politicians and the big companies. Others argue that ordinary people must change their habits too. If everyone had cut down on meat consumption and driven less, emissions would have been considerably lower. At the same time, it is important to remember that the poorest countries are hit hardest, even though they have contributed the least to the problem. Many experts therefore stress that the solution must be fair. There is little point in introducing measures that only the richest can afford.',
  },
  {
    id: 'b2-ki',
    title: 'Kunstig intelligens på jobben',
    genre: 'news',
    cefrLevel: 'B2',
    estimatedMinutes: 5,
    conceptIds: ['academic-writing', 'advanced-word-order', 'professional-norwegian'],
    content: 'Kunstig intelligens er i ferd med å forandre arbeidslivet. Stadig flere oppgaver som tidligere ble utført av mennesker, kan nå automatiseres. Ifølge flere undersøkelser vil dette skape nye yrker, samtidig som enkelte gamle forsvinner. Særlig interessant er det at teknologien ikke bare erstatter rutinearbeid, men også begynner å utføre mer kompliserte oppgaver. Mange arbeidstakere er bekymret for framtiden sin. Eksperter understreker likevel at de som er villige til å lære nye ferdigheter, vil stå sterkest. Derfor blir livslang læring stadig viktigere. Spørsmålet er ikke om vi kommer til å bruke kunstig intelligens, men hvordan vi kan bruke den på en ansvarlig måte.',
    contentEn: 'Artificial intelligence is in the process of transforming working life. More and more tasks that were previously carried out by humans can now be automated. According to several studies, this will create new professions, while some old ones disappear. It is particularly interesting that the technology does not only replace routine work, but is also beginning to perform more complicated tasks. Many workers are worried about their future. Experts nevertheless stress that those who are willing to learn new skills will be best positioned. That is why lifelong learning is becoming ever more important. The question is not whether we are going to use artificial intelligence, but how we can use it in a responsible way.',
  },
  {
    id: 'b2-dialekter',
    title: 'Dialekter i Norge',
    genre: 'news',
    cefrLevel: 'B2',
    estimatedMinutes: 5,
    conceptIds: ['stylistic-variation', 'text-cohesion', 'nuanced-register'],
    content: 'Norge er kjent for sitt store mangfold av dialekter. I motsetning til mange andre land bruker nordmenn dialekten sin nesten overalt — også på TV, på jobb og i det offentlige rom. Det finnes ingen offisiell «standard» talemåte som alle forventes å bruke. For en som lærer norsk, kan dette virke forvirrende i begynnelsen. Et ord kan uttales på mange ulike måter, avhengig av hvor i landet man befinner seg. Likevel ser de fleste på dette mangfoldet som noe positivt. Dialekten forteller noe om hvor en person kommer fra, og mange er stolte av sin egen måte å snakke på. Med litt tålmodighet venner man seg fort til variasjonen.',
    contentEn: 'Norway is known for its great diversity of dialects. Unlike many other countries, Norwegians use their dialect almost everywhere — including on TV, at work and in public spaces. There is no official "standard" way of speaking that everyone is expected to use. For someone learning Norwegian, this can seem confusing at first. A word can be pronounced in many different ways, depending on where in the country you are. Still, most people see this diversity as something positive. The dialect says something about where a person comes from, and many are proud of their own way of speaking. With a little patience, you quickly get used to the variation.',
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
                  {(['all', 'A1', 'A2', 'B1', 'B2'] as const).map((lvl) => (
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
