import { readFileSync } from 'node:fs'
import { generateSession } from '../src/engine/scheduler'
import { getGraphForLevel } from '../src/lib/concept-graph-loader'
import { loadContentSentences } from '../src/lib/content-loader'

const { sentences, availableSentenceIds } = loadContentSentences()
for (const lvl of ['B1', 'B2'] as const) {
  const fp = JSON.parse(readFileSync(`output/fp-${lvl}.json`, 'utf8'))
  const out = generateSession({ fingerprint: fp, graph: getGraphForLevel(lvl), availableSentenceIds, sentences })
  console.log(`\n=== ${lvl} ===`)
  for (const b of out.blocks) {
    const t: Record<string, number> = {}
    b.items.forEach((it: any) => { t[it.exerciseType] = (t[it.exerciseType] || 0) + 1 })
    console.log(`  ${b.type} "${b.label}": ${b.items.length} items`, JSON.stringify(t))
  }
  const lytt = out.blocks.find((b: any) => b.type === 'lytt')
  const badLytt = (lytt?.items ?? []).map((i: any) => i.exerciseType).filter((x: string) => x !== 'listening-comprehension')
  console.log(`  Lytt present: ${!!lytt}; NON-listening items in Lytt: ${badLytt.length} (was the Rule-6 bug if >0)`)
}
