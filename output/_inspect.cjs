const fs = require('fs');
const a = JSON.parse(fs.readFileSync('content/sentences/a1.json', 'utf8'));
const sample = a[0];
const keys = Object.keys(sample);

// Detect concept field: a top-level string field whose value looks like a kebab concept slug
const slugRe = /^[a-z]+(-[a-z0-9]+)+$/;
let field = null;
for (const k of keys) {
  const v = sample[k];
  if (typeof v === 'string' && slugRe.test(v)) { field = k; break; }
}
// fallback: array field of slugs
if (!field) {
  for (const k of keys) {
    const v = sample[k];
    if (Array.isArray(v) && v.length && typeof v[0] === 'string' && slugRe.test(v[0])) { field = k + '[]'; break; }
  }
}

const counts = {};
for (const s of a) {
  let cv;
  if (field && field.endsWith('[]')) cv = s[field.slice(0, -2)] && s[field.slice(0, -2)][0];
  else cv = s[field];
  counts[cv] = (counts[cv] || 0) + 1;
}
const entries = Object.entries(counts).sort((x, y) => x[1] - y[1]);

// write compact schema (one line)
fs.writeFileSync('output/_schema.json', JSON.stringify(sample));
// write keys
fs.writeFileSync('output/_keys.txt', keys.join('\n'));
// write per-concept counts (one per line: count<TAB>concept)
fs.writeFileSync('output/_counts.txt', entries.map(([c, n]) => n + '\t' + c).join('\n'));

const min = entries[0] ? entries[0][1] : 0;
const max = entries[entries.length - 1] ? entries[entries.length - 1][1] : 0;
process.stdout.write('field=' + field + ' concepts=' + entries.length + ' total=' + a.length + ' min=' + min + ' max=' + max);
