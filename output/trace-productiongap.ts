// Trace: prove the productionGap wiring produces a real pre/post diff.
// Replays the exact composition recordResult now performs (logError → computeProductionGap)
// run: npx tsx output/trace-productiongap.ts
import { createEmptyFingerprint } from '../src/types/fingerprint'
import { logError, computeProductionGap } from '../src/engine/fingerprint'

const C = 'verb-tense'
let fp = createEmptyFingerprint('trace-user')
console.log('PRE  productionGap:', JSON.stringify(fp.productionGap)) // expect {}

// helper mirroring recordResult: log an error then recompute productionGap for the concept
function record(exerciseType: any, wrong: string) {
  fp = logError(fp, { conceptId: C, errorTag: 'verb-tense', exerciseType, wrong, correct: 'x' })
  fp = { ...fp, productionGap: { ...fp.productionGap, [C]: computeProductionGap(fp.recentErrors, C) } }
}

record('translation-to-norwegian', 'a')   // writing/production error
console.log('after 1 production error:', fp.productionGap[C], '(expect +100 — pure production)')
record('translation-to-norwegian', 'b')
console.log('after 2 production errors:', fp.productionGap[C], '(expect +100)')
record('translation-to-english', 'c')      // recognition error
console.log('after +1 recognition error:', fp.productionGap[C], '(expect ~+33 — 2 prod vs 1 recog)')
record('listening-comprehension', 'd')
record('translation-to-english', 'e')
console.log('after 2 prod / 3 recog:', fp.productionGap[C], '(expect -20 — recognition-skewed)')

const ok = fp.productionGap[C] === -20 && Object.keys(fp.productionGap).length === 1
console.log('\nPOST productionGap:', JSON.stringify(fp.productionGap))
console.log(ok ? 'TRACE PASS: productionGap moves with real error signal' : 'TRACE FAIL')
process.exit(ok ? 0 : 1)
