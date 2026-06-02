const fs=require('fs');
const norm=a=>Array.isArray(a)?[...a].sort().join('|'):'';
for(const lvl of ['b1','b2']){
  const staged=JSON.parse(fs.readFileSync(`content/sentences/staging/retag/${lvl}.json`,'utf8'));
  const live=JSON.parse(fs.readFileSync(`content/sentences/${lvl}.json`,'utf8'));
  const liveById=new Map(live.map(r=>[r.id,r]));
  let pending=[], reviewPending=0, missing=[];
  for(const s of staged){
    const l=liveById.get(s.id);
    if(!l){ missing.push(s.id); continue; }
    const tagDiff=norm(s.error_tags_detectable)!==norm(l.error_tags_detectable);
    const cDiff=norm(s.concept_ids)!==norm(l.concept_ids);
    if(tagDiff||cDiff){
      const review=!!s._linguistReview;
      if(review) reviewPending++;
      pending.push({id:s.id, from:norm(l.error_tags_detectable), to:norm(s.error_tags_detectable), review});
    }
  }
  console.log(`\n### ${lvl.toUpperCase()}: ${staged.length} staged, ${pending.length} PENDING (not yet live), ${reviewPending} of them _linguistReview, ${missing.length} missing-in-live`);
  if(missing.length) console.log('  missing:', missing.join(','));
  // group pending by concept prefix
  const byPfx={};
  pending.forEach(p=>{const pfx=p.id.replace(/-\d+$/,'');byPfx[pfx]=(byPfx[pfx]||0)+1;});
  console.log('  pending by group:', JSON.stringify(byPfx));
}
