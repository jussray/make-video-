import test from 'node:test';
import assert from 'node:assert/strict';
import { newProject,normalizeProject } from '../assets/model.js';
import {MAX_SHOT_IMAGE_CHARS,MAX_PROJECT_IMAGE_CHARS} from '../assets/photo.js';

test('valid small embedded JPEG travels with storyboard JSON',()=>{
 const p=newProject();
 const image='data:image/jpeg;base64,'+'A'.repeat(100);
 p.shots[0].imageData=image;
 const loaded=normalizeProject(JSON.parse(JSON.stringify(p)));
 assert.equal(loaded.shots[0].imageData,image);
});
test('reject non-JPEG, non-data and oversized imported shot images',()=>{
 const p=newProject();
 for(const malicious of ['https://example.com/track.jpg','data:image/svg+xml,<svg/>','data:image/png;base64,AA','data:image/jpeg;base64,x"y']) {
  p.shots[0].imageData=malicious;
  assert.throws(()=>normalizeProject(p),/bounded JPEG/);
 }
 p.shots[0].imageData='data:image/jpeg;base64,'+'A'.repeat(MAX_SHOT_IMAGE_CHARS);
 assert.throws(()=>normalizeProject(p),/bounded JPEG/);
});
test('limits total embedded image data to protect local storage',()=>{
 const p=newProject();
 const sample='data:image/jpeg;base64,'+'A'.repeat(95_000);
 p.shots=Array.from({length:24},(_,i)=>({...p.shots[0],id:String(i),imageData:sample}));
 assert.ok(24*sample.length<MAX_PROJECT_IMAGE_CHARS);
 assert.doesNotThrow(()=>normalizeProject(p));
 p.shots.forEach(shot=>shot.imageData='data:image/jpeg;base64,'+'A'.repeat(104_000));
 assert.throws(()=>normalizeProject(p),/too much embedded/);
});
