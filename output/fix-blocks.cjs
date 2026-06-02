const fs=require('fs');
// Linguist-authored corrected rows for the 9 held REWRITE blocks (field overrides).
const PATCH={
  'b1-prp-029':{norwegian:'Det var et _____ (utvikle) kurs som lærte meg mye.',english:'It was an enriching course that taught me a lot.',notes:'utviklende',error_tags_detectable:['adjective-agreement']},
  'b1-cs-019':{norwegian:'Det er tidspress _____ gjør prosjektet vanskelig.',english:'It is time pressure that makes the project difficult.',notes:'som',error_tags_detectable:['wrong-word-same-category']},
  'b1-cx-005':{norwegian:'Selv om jeg er trøtt, _____ (klarer/vil) jeg å fullføre arbeidet.',english:'Even though I am tired, I will manage to finish the work.',notes:'klarer',error_tags_detectable:['modal-verb']},
  'b1-fr-029':{norwegian:'Besøkende bes om å _____ (skrive/si) seg inn i gjestelisten ved inngangen.',english:'Visitors are requested to sign themselves into the guest list at the entrance.',notes:'skrive',error_tags_detectable:['wrong-word-same-category','verb-conjugation']},
  'b2-sm-015':{norwegian:'Hvis jeg hadde valgt en annen karrierevei, ville livet mitt ha sett veldig annerledes ut.',english:'If I had chosen a different career path, my life would have looked very different.',notes:'',exercise_types:['translation-to-norwegian'],error_tags_detectable:['verb-tense']},
  'b2-sm-017':{norwegian:'Jeg skulle ønske at vi _____ kjent hverandre bedre da vi var unge.',english:'I wish that we had known each other better when we were young.',notes:'hadde',error_tags_detectable:['verb-tense']},
  'b2-tc-022':{norwegian:'Artikkelen beskriver to teorier. Disse er henholdsvis kjent som evolusjonsteori og skapelsesteori.',english:'The article describes two theories. These are respectively known as evolution theory and creation theory.',error_tags_detectable:['meaning-misunderstood']},
  'b2-tc-029':{norwegian:'Forskningsmiljøet er delt i synet på dette. Noen mener at klimaendringene er menneskeskapte, mens andre hevder det motsatte.',english:'The research community is divided on this. Some believe that climate change is man-made, while others claim the opposite.',error_tags_detectable:['meaning-misunderstood']},
  'b2-avf-021':{norwegian:'De _____ (vedvare) konsekvensene av klimaendringene er enda ikke fullt ut forstått.',english:'The persistent consequences of climate change are not yet fully understood.',notes:'vedvarende',error_tags_detectable:['adjective-agreement']},
};
const TAX=new Set(['word-order','verb-tense','verb-conjugation','noun-gender','article-use','adjective-agreement','pronoun-choice','preposition','modal-verb','negation-placement','compound-word','wrong-word-same-category','wrong-word-different-category','spelling','listening-recognition','reading-parsing','meaning-misunderstood']);
let n=0,seen=new Set();
for(const lvl of ['b1','b2']){
  const path=`content/sentences/${lvl}.json`;
  const rows=JSON.parse(fs.readFileSync(path,'utf8'));
  for(const r of rows){if(PATCH[r.id]){Object.assign(r,PATCH[r.id]);seen.add(r.id);n++;const bad=r.error_tags_detectable.filter(t=>!TAX.has(t));if(bad.length)throw new Error(r.id+' bad tags '+bad);}}
  fs.writeFileSync(path,JSON.stringify(rows,null,2)+'\n','utf8');
}
console.log('patched',n,'block rows');
for(const k of Object.keys(PATCH))if(!seen.has(k))console.log('MISSING',k);
