/**
 * Apply norwegian-linguist review fixes to a1.json / a2.json.
 * Keyed by 8-char id prefix. Only listed fields are overwritten; all other
 * fields and array order are preserved. Run: node output/apply-linguist-fixes.cjs
 */
const fs = require('fs');

// prefix -> { field overrides }. Each entry corresponds to a linguist FLAG/REWRITE.
const PATCHES = {
  // ---------- A1 ----------
  // REWRITES (clear errors)
  '77cff811': { norwegian: 'Jeg er student.', english: 'I am a student.' },                       // weak "student på en skole"
  'eed234ab': { concept_ids: ['possessive-pronouns'], error_tags_detectable: ['pronoun-choice'] }, // mis-tag: tests possessive
  '02e28ed1': { norwegian: 'Jeg drikker et glass kaldt vann.', english: 'I drink a glass of cold water.' }, // the water is cold, not the glass
  'd825e9be': { norwegian: 'Jeg ser ikke ___.', english: 'I do not see the keys.', notes: 'nøklene' },       // NO/EN modal mismatch
  '51a7d71b': { notes: 'laget' },                                                                  // standard weak preterite of lage
  'a418c633': { norwegian: 'Sekken vår er tung.', english: 'Our bag is heavy.', exercise_types: ['translation-to-norwegian'], notes: '' }, // ambiguous blank -> translation
  'b6c812f7': { norwegian: 'Han ___ en gave i går.', english: 'He got a gift yesterday.', notes: 'fikk' },   // ambiguous blank, anchor vocab
  // FLAGS
  'cda4e20b': { norwegian: 'Du er norsk.', english: 'You are Norwegian.' },                        // foreground the pronoun
  '0992b277': { english: 'All of you can sit here.' },                                             // signal plural "dere"
  '20c7107d': { norwegian: 'Kjenner ___ ham?', english: 'Do you all know him?', notes: 'dere' },    // drop A2 "hverandre"
  'bb043819': { norwegian: 'Bordet er rent.', english: 'The table is clean.' },                    // drop secondary definite "middagen"
  '13178007': { norwegian: 'Jeg bør drikke mer vann.', english: 'I should drink more water.', exercise_types: ['translation-to-norwegian'], notes: '' }, // ambiguous modal blank
  '4131447d': { norwegian: 'Vi må gå hjem nå.', english: 'We must go home now.', exercise_types: ['translation-to-norwegian'], notes: '' },               // ambiguous modal blank
  'f362bc29': { english: 'The chair is by the table.' },                                           // "stands" unnatural
  '1d1f74a5': { english: 'We book a room at the hotel.' },                                         // "order a room" = room service
  '49913d15': { norwegian: 'De har to store hunder.', english: 'They have two big dogs.' },         // "store barn" odd; keep plural-adj agreement
  'a2f80d96': { norwegian: 'Vi bor i et lite hus.', english: 'We live in a small house.' },         // drop 2nd adj + A2 "landet"
  '1e95ef8a': { norwegian: 'Han spiser et stort eple hver dag.', english: 'He eats a big apple every day.' }, // "ferskt" A2 vocab -> stort
  '27a89584': { norwegian: 'Jeg har en ___ venn.', english: 'I have a good friend.', notes: 'god' }, // A2 quantifier+plural -> A1 indefinite
  'c04419c5': { error_tags_detectable: ['modal-verb'] },                                           // wrong tag verb-tense
  'ec43e53b': { norwegian: 'Hun liker å lage mat.', english: 'She likes to cook.', error_tags_detectable: ['verb-conjugation'] }, // unchain infinitives
  '546e9374': { norwegian: 'Vi vil lage mat i kveld.', english: 'We want to cook food tonight.', exercise_types: ['translation-to-norwegian'], notes: '' }, // triple chain -> single
  'e8b8068c': { norwegian: 'Mannen leser en bok.', english: 'The man reads a book.' },             // indefinite object = clean SVO
  'e5b843ff': { norwegian: 'Gutten kaster en ball.', english: 'The boy throws a ball.' },          // indefinite object

  // ---------- A2 ----------
  // REWRITES
  'c5ad4247': { norwegian: 'Jeg hentet ___ jakke fra gangen.', english: "I picked up my friend's jacket from the hallway.", notes: 'vennens' }, // "tok" implies theft
  // B1 modal-perfect -> A2 (decision: rewrite down)
  'b0d8f691': { norwegian: 'Vi ville gjerne bestille bord, men restauranten var full.', english: 'We wanted to book a table, but the restaurant was full.' },
  'b792c40e': { norwegian: 'Hun måtte jobbe sent, så hun kom ikke.', english: 'She had to work late, so she did not come.' },
  '7cc59956': { norwegian: 'Han ___ ta en annen buss for å komme dit.', english: 'He had to take a different bus to get there.', notes: 'måtte' },
  'bf2743eb': { norwegian: 'Du burde ta med regnjakken.', english: 'You should bring the rain jacket.' },
  // FLAGS
  'e0f548da': { norwegian: 'Det er ___ å lese enn å se på TV.', english: 'It is more exciting to read than to watch TV.', notes: 'mer spennende' }, // "å gå" ambiguity
  '5e287b1a': { english: 'If there is sun tomorrow, we will cycle to the beach.' },                // EN/NO weather mismatch
  '4b56de1c': { english: 'Two thirds of the cake has been eaten.' },                               // "are eaten" stilted
  '683269c0': { norwegian: 'Biblioteket er høyere enn rådhuset.', english: 'The library is taller than the town hall.' }, // drop 2nd challenge (definite adj)
};

// Intentionally left unchanged (correct & natural; flag was minor tagging/style with no clean fix):
//  A1: df00abb7 (vente på collocation), 2f824de0 (snakke om collocation), 00a7e618 (impersonal det),
//      322fa395 (drakk — correct, borderline level kept)
//  A2: 2821470d (Hvis/Dersom both valid — Hvis is canonical), b21d930a (-s genitive is the teaching point),
//      011e5bca (grammar fine; level confirmed intentional)

let applied = 0, missing = [];
const seen = new Set();
for (const lvl of ['a1', 'a2']) {
  const path = `content/sentences/${lvl}.json`;
  const rows = JSON.parse(fs.readFileSync(path, 'utf8'));
  for (const row of rows) {
    const pfx = row.id.slice(0, 8);
    if (PATCHES[pfx]) {
      Object.assign(row, PATCHES[pfx]);
      seen.add(pfx);
      applied++;
    }
  }
  fs.writeFileSync(path, JSON.stringify(rows, null, 2) + '\n', 'utf8');
  console.log(`${lvl}: wrote ${rows.length} rows`);
}
for (const k of Object.keys(PATCHES)) if (!seen.has(k)) missing.push(k);
console.log(`Applied ${applied} patches across ${Object.keys(PATCHES).length} ids.`);
if (missing.length) console.log('MISSING (id not found!):', missing);
else console.log('All patch ids matched.');
