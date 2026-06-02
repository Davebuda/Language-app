// Final 3 fixes from the re-review of rewritten rows.
const fs = require('fs');
const P = {
  '0992b277': { english: 'You (plural) can sit here.' },                          // signal "dere" cleanly
  'c5ad4247': { english: "I picked up a friend's jacket from the hallway." },     // "vennens" = a friend's (no "my")
  '4b56de1c': { norwegian: 'Vi spiste to tredjedeler av kaken.', english: 'We ate two thirds of the cake.' }, // drop B1 passive
};
let n = 0; const seen = new Set();
for (const lvl of ['a1', 'a2']) {
  const p = `content/sentences/${lvl}.json`;
  const rows = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const r of rows) { const k = r.id.slice(0, 8); if (P[k]) { Object.assign(r, P[k]); seen.add(k); n++; } }
  fs.writeFileSync(p, JSON.stringify(rows, null, 2) + '\n', 'utf8');
}
console.log('applied', n, 'final fixes');
for (const k of Object.keys(P)) if (!seen.has(k)) console.log('MISSING', k);
