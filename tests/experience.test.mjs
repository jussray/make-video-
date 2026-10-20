import test from 'node:test';
import assert from 'node:assert/strict';
import { experienceToStoryboard } from '../assets/experience.js';

const manifest = {
  schema:'jussco/visual-experience/v1',kind:'architecture',title:'Governed standalone peers',
  items: [
    {id:'fcr',title:'Founder Control Room',summary:'Independent founder operating authority',state:'VERIFIED_SOURCE'},
    {id:'sol',title:'SolContinuity',summary:'Independent continuity product',state:'UNKNOWN'},
  ],
  edges:[{from:'fcr',to:'sol',label:'Declared receipt handoff'}]
};

test('source-labeled experience creates editable MakeVideo shots, never a verified release',()=>{
  const p=experienceToStoryboard(manifest);
  assert.equal(p.schema,'makevideo/storyboard/v1');
  assert.equal(p.shots.length,2);
  assert.equal(p.shots[0].title,'Founder Control Room');
  assert.match(p.shots[1].caption,/ILLUSTRATIVE · DECLARED UNKNOWN/);
  assert.match(p.shots[0].caption,/ILLUSTRATIVE · DECLARED VERIFIED SOURCE/);
  assert.match(p.shots[0].continuity,/→ sol: Declared receipt handoff/);
  assert.match(p.shots[1].continuity,/← fcr: Declared receipt handoff/);
  assert.match(p.goal,/NOT authenticated GitHub/);
  assert.equal(p.shots[0].imageData,'');
  assert.equal(p.shots[0].duration,4);
});

test('invalid or spoofed source claims fail closed',()=>{
  const m=structuredClone(manifest);
  m.items[0].state='DEPLOYED';
  assert.throws(()=>experienceToStoryboard(m),/evidence state/);
  m.items[0].state='VERIFIED_SOURCE'; m.edges[0].to='nonexistent';
  assert.throws(()=>experienceToStoryboard(m),/edges/);
  m.edges[0].to='sol'; m.items[0].id='sol';
  assert.throws(()=>experienceToStoryboard(m),/unique/);
});

test('flows and canon are accepted but cannot claim product verification',()=>{
  for(const kind of ['playtest','canon']){
    const p=experienceToStoryboard({...manifest,kind});
    assert.match(p.goal,/NOT authenticated GitHub/);
    assert.equal(p.shots.length,2);
  }
});