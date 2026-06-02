// Usage: node output/setup-level.cjs <level> <concept1,concept2,...>
// - writes output/all-norwegian-<level>.txt (all norwegian strings in that level)
// - writes output/existing-<concept>.json (slim) for each listed concept
// - prints per-concept count + tags + exercise-mix
const fs = require('fs');
const level = (process.argv[2] || 'a1').toLowerCase();
const concepts = (process.argv[3] || '').split(',').map(s => s.trim()).filter(Boolean);
const a = JSON.parse(fs.readFileSync('content/sentences/' + level + '.json', 'utf8'));
fs.writeFileSync('output/all-norwegian-' + level + '.txt', a.map(r => r.norwegian).filter(Boolean).join('\n'));
for (const concept of concepts) {
  const rows = a.filter(s => Array.isArray(s.concept_ids) && s.concept_ids.includes(concept));
  const tags = new Set(), ex = {};
  for (const r of rows) { (r.error_tags_detectable || []).forEach(t => tags.add(t)); for (const e of (r.exercise_types || [])) ex[e] = (ex[e] || 0) + 1; }
  const slim = rows.map(r => ({ norwegian: r.norwegian, english: r.english, exercise_types: r.exercise_types, error_tags_detectable: r.error_tags_detectable, difficulty: r.difficulty, notes: r.notes }));
  fs.writeFileSync('output/existing-' + concept + '.json', JSON.stringify(slim, null, 1));
  process.stdout.write(concept + ': count=' + rows.length + ' gap=' + Math.max(0, 40 - rows.length) + ' tags=' + [...tags].join(',') + '\n');
}
process.stdout.write('all-norwegian-' + level + '.txt=' + a.length + ' lines\n');
