// Re-run the mechanical content-gate on the 33 linguist-fixed rows.
import { readFileSync } from 'node:fs'
import { gateRow } from '../scripts/lib/content-gate'

const PREFIXES = new Set([
  '77cff811','eed234ab','02e28ed1','d825e9be','51a7d71b','a418c633','b6c812f7',
  'cda4e20b','0992b277','20c7107d','bb043819','13178007','4131447d','f362bc29',
  '1d1f74a5','49913d15','a2f80d96','1e95ef8a','27a89584','c04419c5','ec43e53b',
  '546e9374','e8b8068c','e5b843ff',
  'c5ad4247','b0d8f691','b792c40e','7cc59956','bf2743eb','e0f548da','5e287b1a',
  '4b56de1c','683269c0',
])

let pass = 0, fail = 0
for (const lvl of ['a1', 'a2']) {
  const rows = JSON.parse(readFileSync(`content/sentences/${lvl}.json`, 'utf8')) as any[]
  for (const r of rows) {
    if (!PREFIXES.has(r.id.slice(0, 8))) continue
    const res = gateRow(r)
    if (res.ok) { pass++ }
    else { fail++; console.log(`FAIL ${r.id.slice(0,8)} [${lvl}] "${r.norwegian}" -> ${res.reasons.join('; ')}`) }
  }
}
console.log(`\nGate: ${pass} PASS / ${fail} FAIL of ${PREFIXES.size} fixed rows`)
process.exit(fail ? 1 : 0)
