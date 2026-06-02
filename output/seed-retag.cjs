const fs=require('fs');
const TAX=new Set(['word-order','verb-tense','verb-conjugation','noun-gender','article-use','adjective-agreement','pronoun-choice','preposition','modal-verb','negation-placement','compound-word','wrong-word-same-category','wrong-word-different-category','spelling','listening-recognition','reading-parsing','meaning-misunderstood']);
// Linguist REWRITE blocks — pre-existing sentence errors; hold back (do NOT apply staged tag), need a content rewrite pass.
const HOLD=new Set(['b1-prp-029','b1-cs-019','b1-cx-005','b1-fr-029','b2-sm-015','b2-sm-017','b2-tc-022','b2-tc-029','b2-avf-021']);
const norm=a=>Array.isArray(a)?[...a].sort().join('|'):'';
let totalApplied=0, totalHeld=0;
for(const lvl of ['b1','b2']){
  const staged=JSON.parse(fs.readFileSync(`content/sentences/staging/retag/${lvl}.json`,'utf8'));
  const path=`content/sentences/${lvl}.json`;
  const live=JSON.parse(fs.readFileSync(path,'utf8'));
  const byId=new Map(live.map(r=>[r.id,r]));
  let applied=0, held=0, skippedMissing=0;
  for(const s of staged){
    if(HOLD.has(s.id)){ held++; continue; }
    const l=byId.get(s.id);
    if(!l){ skippedMissing++; continue; }
    const tags=Array.isArray(s.error_tags_detectable)?s.error_tags_detectable:[];
    if(tags.length===0||tags.some(t=>!TAX.has(t))){ console.log('  BAD TAGS skip',s.id,tags.join(',')); continue; }
    if(norm(tags)!==norm(l.error_tags_detectable)){ l.error_tags_detectable=[...tags]; applied++; }
  }
  // validate every live row still has valid non-empty tags
  for(const r of live){
    const t=Array.isArray(r.error_tags_detectable)?r.error_tags_detectable:[];
    if(t.length===0) throw new Error(`${lvl} ${r.id}: empty tags`);
    const bad=t.filter(x=>!TAX.has(x)); if(bad.length) throw new Error(`${lvl} ${r.id}: invalid ${bad.join(',')}`);
  }
  fs.writeFileSync(path, JSON.stringify(live,null,2)+'\n','utf8');
  console.log(`${lvl.toUpperCase()}: applied ${applied} tag rows, held ${held} (REWRITE blocks), missing ${skippedMissing}, rows=${live.length}`);
  totalApplied+=applied; totalHeld+=held;
}
console.log(`TOTAL applied ${totalApplied}, held ${totalHeld}. SEED_OK`);
