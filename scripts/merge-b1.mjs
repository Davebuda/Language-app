import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const original = JSON.parse(readFileSync(join(root, 'content/sentences/b1.json'), 'utf8'));
const batch1 = JSON.parse(readFileSync(join(root, 'content/sentences/staging/batch1-sub-dm-pv-dd.json'), 'utf8'));
const batch2 = JSON.parse(readFileSync(join(root, 'content/sentences/staging/batch2-cx-fr-id-iq.json'), 'utf8'));

const merged = [...original, ...batch1, ...batch2];

// Sanity checks
const ids = merged.map(s => s.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) {
  console.error('Duplicate IDs found:', dupes);
  process.exit(1);
}

console.log(`Total sentences: ${merged.length}`);
console.log(`  Original: ${original.length}`);
console.log(`  Batch 1 (sub/dm/pv/dd): ${batch1.length}`);
console.log(`  Batch 2 (cx/fr/id/iq): ${batch2.length}`);

// Verify concept coverage
const conceptCounts = {};
for (const s of merged) {
  for (const c of s.concept_ids) {
    conceptCounts[c] = (conceptCounts[c] || 0) + 1;
  }
}
console.log('\nConcept counts:');
for (const [concept, count] of Object.entries(conceptCounts)) {
  console.log(`  ${concept}: ${count}`);
}

writeFileSync(join(root, 'content/sentences/b1.json'), JSON.stringify(merged, null, 2), 'utf8');
console.log('\nWrote content/sentences/b1.json successfully.');
