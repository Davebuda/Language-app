// Usage: node output/extract-concept.cjs <concept-id>
// Writes existing live A1 sentences for the concept to output/existing-<concept>.json
// and prints: count, error_tags used, exercise_types distribution.
const fs = require('fs');
const concept = process.argv[2];
if (!concept) { console.error('need concept'); process.exit(1); }
const a = JSON.parse(fs.readFileSync('content/sentences/a1.json', 'utf8'));
const rows = a.filter(s => Array.isArray(s.concept_ids) && s.concept_ids.includes(concept));
const tags = new Set(), ex = {};
for (const r of rows) {
  (r.error_tags_detectable || []).forEach(t => tags.add(t));
  for (const e of (r.exercise_types || [])) ex[e] = (ex[e] || 0) + 1;
}
const slim = rows.map(r => ({ norwegian: r.norwegian, english: r.english, exercise_types: r.exercise_types, error_tags_detectable: r.error_tags_detectable, difficulty: r.difficulty, notes: r.notes }));
fs.writeFileSync('output/existing-' + concept + '.json', JSON.stringify(slim, null, 1));
process.stdout.write('count=' + rows.length + ' tags=' + [...tags].join(',') + ' ex=' + JSON.stringify(ex));
