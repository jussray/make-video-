import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStoryEngineDraft, storyEngineDraftJson } from '../assets/storyEngineHandoff.js';

const shot = (id, duration = 4) => ({
  id, title: 'Shot ' + id, duration,
  visual: 'Subject walks into the light', caption: 'Welcome',
  narration: 'private voice direction', continuity: 'private character notes',
  imageData: 'data:image/jpeg;base64,' + 'A'.repeat(250000),
  provider_token: 'not a provider credential'
});
const project = (shots = [shot('one'), shot('two')]) => ({
  schema: 'makevideo/storyboard/v1', title: 'A short film',
  goal: 'Communicate a simple story', format: '9:16',
  audience: 'private audience notes', cta: 'private CTA notes',
  authority_granted: true, approve_provider_spend: true,
  shots, updatedAt: '2026-10-20T00:00:00.000Z'
});

test('draft handoff remains compatible with the StoryEngine storyboard/v1 importer', () => {
  const result = buildStoryEngineDraft(project());
  assert.equal(result.schema, 'makevideo/storyboard/v1');
  assert.equal(result.shots.length, 2);
  assert.equal(result.shots.reduce((total,s) => total + s.duration, 0), 8);
  assert.equal(result.format, '9:16');
  assert.equal(result.shots[0].visual, 'Subject walks into the light');
  assert.equal(result.goal, 'Communicate a simple story');
  assert.ok(new TextEncoder().encode(storyEngineDraftJson(project())).byteLength < 150000);
  assert.doesNotThrow(() => JSON.parse(storyEngineDraftJson(project())));
});

test('draft export excludes embedded private images, narrator notes and any authority or spending claims', () => {
  const exported = storyEngineDraftJson(project());
  for (const privateValue of [
    'data:image', 'private voice direction', 'private character notes',
    'private audience notes', 'private CTA notes', 'provider_token',
    'approve_provider_spend', 'authority_granted', 'updatedAt'
  ]) assert.equal(exported.includes(privateValue), false);
  const parsed = JSON.parse(exported);
  assert.deepEqual(Object.keys(parsed.shots[0]), ['id', 'title', 'duration', 'visual', 'caption']);
  assert.equal(parsed.shots[0].duration, 4);
});

test('makevideo handoff blocks drafts that StoryEngine cannot import', () => {
  const tooManyShots = project(Array.from({length:13},(_,i)=>shot('s'+i,2)));
  const tooLong = project(Array.from({length:6},(_,i)=>shot('s'+i,12)));
  assert.throws(()=>buildStoryEngineDraft(tooManyShots),/1–12 shots/);
  assert.throws(()=>buildStoryEngineDraft(tooLong),/60 seconds/);
  assert.throws(()=>buildStoryEngineDraft(project([shot('s1',1)])),/2–12 seconds/);
  assert.throws(()=>buildStoryEngineDraft(project([shot('s1',13)])),/2–12 seconds/);
  assert.throws(()=>buildStoryEngineDraft(project([shot('s1',NaN)])),/2–12 seconds/);
  assert.throws(()=>buildStoryEngineDraft(project([{duration:4}])),/needs visual direction/);
  assert.throws(()=>buildStoryEngineDraft({...project(),schema:'makevideo/storyboard/v999'}),/valid MakeVideo storyboard/);
});

test('makevideo handoff clamps content to the receiving importer accepted bounds', () => {
  const p=project([{
    id:'id'.repeat(100),title:'T'.repeat(150),duration:12,
    visual:'v'.repeat(1000),caption:'c'.repeat(200)
  }]);
  const out=buildStoryEngineDraft(p);
  assert.equal(out.shots[0].id.length,100);
  assert.equal(out.shots[0].title.length,100);
  assert.equal(out.shots[0].visual.length,500);
  assert.equal(out.shots[0].caption.length,180);
  assert.equal(out.shots[0].duration,12);
  assert.equal(out.shots[0].imageData,undefined);
});
