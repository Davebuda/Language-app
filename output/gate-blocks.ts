import { readFileSync } from 'node:fs'
import { gateRow } from '../scripts/lib/content-gate'
const IDS=new Set(['b1-prp-029','b1-cs-019','b1-cx-005','b1-fr-029','b2-sm-015','b2-sm-017','b2-tc-022','b2-tc-029','b2-avf-021'])
let pass=0,fail=0
for(const lvl of ['b1','b2']){
  const rows=JSON.parse(readFileSync(`content/sentences/${lvl}.json`,'utf8')) as any[]
  for(const r of rows){ if(!IDS.has(r.id)) continue
    const res=gateRow(r)
    if(res.ok) pass++; else { fail++; console.log(`FAIL ${r.id}: ${res.reasons.join('; ')}`) }
  }
}
console.log(`\nGate: ${pass} PASS / ${fail} FAIL of 9 fixed blocks`)
process.exit(fail?1:0)
