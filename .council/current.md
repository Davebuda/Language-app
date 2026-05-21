# Task Brief
**Task:** Stream 4.2 — Daily Word Pack
**Date:** 2026-05-21
**Status:** IN PROGRESS

---

## What

Two files to create, one file to modify:

**Create:**
- `src/components/DailyWordPack.tsx` — word pack component (dashboard only, tap-to-reveal each word)

**Modify:**
- `src/lib/dailyContent.ts` — add 42-word seed (7 days × 6 words) and `getDailyWords()` function
- `src/app/dashboard/page.tsx` — add `<DailyWordPack />` after DailyLearningCard, before Stats grid

---

## How

### Add to `src/lib/dailyContent.ts`

Add a `DailyWord` type and `getDailyWords()` function:

```ts
export type DailyWord = {
  norwegian: string
  english: string
  exampleSentence: string   // Norwegian sentence using the word
  wordClass: string          // noun / verb / adjective / adverb
}

const WORD_PACKS: DailyWord[][] = [
  // 7 groups, one per date index (0-6)
  // Each group: 6 words
]

export function getDailyWords(): DailyWord[] {
  return WORD_PACKS[new Date().getDate() % 7]
}
```

Seed 42 words across 7 daily packs covering: daily routines, common verbs, emotions, food, travel, common adjectives. All Norwegian must be correct Bokmål.

**Word pack content (7 packs × 6 words):**

Pack 0 — Daily routines:
- stå opp / get up / verb / "Jeg står opp klokken syv."
- frokost / breakfast / noun / "Vi spiser frokost sammen."
- jobbe / work / verb / "Han jobber hjemmefra i dag."
- trøtt / tired / adjective / "Jeg er veldig trøtt om morgenen."
- dusje / shower / verb / "Hun dusjer alltid før jobb."
- kveld / evening / noun / "Vi slapper av om kvelden."

Pack 1 — Common verbs:
- snakke / speak / verb / "Kan du snakke saktere?"
- forstå / understand / verb / "Jeg forstår ikke alt ennå."
- hjelpe / help / verb / "Vil du hjelpe meg?"
- lære / learn / verb / "Vi lærer norsk sammen."
- huske / remember / verb / "Husker du det?"
- glemme / forget / verb / "Jeg glemmer alltid nøklene mine."

Pack 2 — Emotions:
- glad / happy / adjective / "Hun er veldig glad i dag."
- lei seg / sad / adjective / "Han er lei seg for det."
- overrasket / surprised / adjective / "Jeg er overrasket over nyheten."
- nervøs / nervous / adjective / "Er du nervøs for prøven?"
- rolig / calm / adjective / "Prøv å være rolig."
- spent / excited / adjective / "Barna er spent på ferien."

Pack 3 — Food:
- middag / dinner / noun / "Vi lager middag klokken seks."
- grønnsaker / vegetables / noun / "Spis flere grønnsaker!"
- drikke / drink / verb / "Vil du drikke noe?"
- sulten / hungry / adjective / "Jeg er veldig sulten nå."
- smake / taste / verb / "Kan jeg smake?"
- matbutikk / grocery store / noun / "Jeg går i matbutikken i dag."

Pack 4 — Travel:
- reise / travel / verb / "Vi reiser til Bergen neste uke."
- flyplass / airport / noun / "Er flypassen langt unna?"
- hotell / hotel / noun / "Hotellet er i sentrum."
- kart / map / noun / "Har du et kart?"
- billett / ticket / noun / "Jeg har to billetter."
- fin / nice/beautiful / adjective / "Det er et fint land."

Pack 5 — Common adjectives:
- stor / big / adjective / "Det er et stort hus."
- liten / small / adjective / "Katten er liten og søt."
- ny / new / adjective / "Jeg har en ny bil."
- gammel / old / adjective / "Det er et gammelt hus."
- viktig / important / adjective / "Det er viktig å øve."
- enkel / simple / adjective / "Det er en enkel oppgave."

Pack 6 — Describing people/things:
- hyggelig / friendly / adjective / "Han er veldig hyggelig."
- flink / good at / adjective / "Du er flink til å snakke norsk."
- interessant / interesting / adjective / "Det er en interessant bok."
- morsom / funny / adjective / "Hun er veldig morsom."
- kjent / famous/known / adjective / "Oslo er en kjent by."
- vanlig / common/usual / adjective / "Det er en vanlig norsk rett."

### `src/components/DailyWordPack.tsx`

```tsx
'use client'
import { useState } from 'react'
import { getDailyWords } from '@/lib/dailyContent'
```

Card structure:
1. `role="region"` with `aria-label="Dagens ordliste"`
2. Label chip: `"Dagens ord"` — use `nc-label` class
3. Heading: count + topic hint, e.g. `"6 ord for i dag"` — small, muted
4. Word list: each word rendered as a card row with:
   - Norwegian word — bold, `text-[var(--nc-text)]`
   - Word class chip — tiny badge (noun/verb/adj), muted
   - "Vis" toggle button to reveal English + example sentence
   - When revealed: English translation in muted text, then example sentence in italic
5. Card container: `nc-glass p-4 border-l-2 border-[var(--nc-red-border)]`

Each word item should use local toggle state. A simple approach: `useState<Set<number>>` tracking which indices are expanded. Alternatively, each word can be its own small component with its own `useState`. Use whichever is cleaner.

Accessibility:
- Each reveal button: `aria-expanded={isExpanded}`, `aria-label={Vis ${word.norwegian}}`
- Word container: keyboard accessible (button handles Enter/Space)

**No Framer Motion** — simple `max-h` CSS transition for the reveal, same pattern as `DailyLearningCard`.

### Modify `src/app/dashboard/page.tsx`

Import `DailyWordPack` at top. Add `<DailyWordPack />` immediately after `<DailyLearningCard />` (the card already placed at line 384).

---

## Model
sonnet

## Acceptance Criteria

1. 6 words render on `/dashboard` for the current day — no horizontal scroll on mobile
2. Each word row shows a toggle button; click reveals English translation + example sentence
3. All 6 words can be individually expanded/collapsed independently
4. `role="region"` with `aria-label="Dagens ordliste"` on the container
5. Each reveal button has `aria-expanded` and `aria-label` with the Norwegian word
6. No new npm dependencies
7. No TypeScript errors
8. 0 console errors on dashboard (scheduler warnings are pre-existing and acceptable)

## Blocking Flags

Stop and write `BLOCKED: [reason]` to this file if:
- The `getDailyWords()` import from `@/lib/dailyContent` fails (check for export)
- Any TypeScript error is introduced that you cannot fix correctly
- The component tree nesting causes a React key warning or hydration mismatch

## Playwright Checkpoint
yes

What to test:
- Navigate to `/dashboard` — confirm DailyWordPack renders below DailyLearningCard
- Confirm 6 word rows are visible
- Click first word's toggle — translation + example sentence appears
- Snapshot accessibility tree — confirm `region "Dagens ordliste"` present
- No console errors
