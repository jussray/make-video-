import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCinematicEvidence } from '../src/cinematicEvidenceGate.js';
const hash = 'sha256:' + 'a'.repeat(64);
const baseline = {
  shots: [
    {id:'cinematic-1', kind:'cinematic', source_type:'generated-video', truth_class:'ILLUSTRATIVE', disclosure_visible:true, media_sha256:hash, duration_seconds:10,
     temporal_evidence:{probe_receipt_id:'p1',probed_media_sha256:hash,motion_review_receipt_id:'m1',sampled_frames:10,distinct_frames:10}},
    {id:'runtime-2', kind:'product-demo', source_type:'runtime-capture', truth_class:'DEMONSTRATED', media_sha256:hash, duration_seconds:10, runtime_source_sha:'git-sha-1', runtime_capture_receipt_id:'runtime-1',
     temporal_evidence:{probe_receipt_id:'p2',probed_media_sha256:hash,motion_review_receipt_id:'m2',sampled_frames:10,distinct_frames:9}}
  ]
};
const replace = (i, patch) => ({shots:baseline.shots.map((s,j)=>j===i?{...s,...patch}:s)});
test('complete evidence never grants authority or authenticates bytes',()=>{
  const r=auditCinematicEvidence(baseline);
  assert.deepEqual(r.failures,[]);assert.equal(r.evidence_complete,true);
  assert.equal(r.authority_granted,false);assert.equal(r.evidence_authenticity_verified,false);
});
test('reject slideshow or image pan passed off as cinematic video',()=>{
  assert.ok(auditCinematicEvidence(replace(0,{source_type:'still-image'})).failures.includes('shot_1_not_continuous_video_source'));
});
test('reject generated UI pretending to demonstrate product',()=>{
  const r=auditCinematicEvidence(replace(1,{source_type:'generated-video',truth_class:'ILLUSTRATIVE'}));
  assert.ok(r.failures.includes('shot_2_runtime_capture_missing'));
  assert.ok(r.failures.includes('shot_2_runtime_truth_class_invalid'));
});
test('block absent temporal evidence and mismatched hashes',()=>{
  const r=auditCinematicEvidence(replace(0,{temporal_evidence:{probe_receipt_id:'p1',probed_media_sha256:'sha256:'+'b'.repeat(64),motion_review_receipt_id:'m1',sampled_frames:10,distinct_frames:1}}));
  assert.ok(r.failures.includes('shot_1_temporal_evidence_missing'));
});
test('block undisclosed cinematic scenes and missing runtime provenance',()=>{
  assert.ok(auditCinematicEvidence(replace(0,{disclosure_visible:false})).failures.includes('shot_1_illustration_disclosure_missing'));
  assert.ok(auditCinematicEvidence(replace(1,{runtime_capture_receipt_id:''})).failures.includes('shot_2_runtime_provenance_missing'));
});
test('reject duplicate and single-shot records',()=>{
  assert.ok(auditCinematicEvidence({shots:[]}).failures.includes('authentic_product_demo_missing'));
  assert.ok(auditCinematicEvidence({shots:[baseline.shots[0]]}).failures.includes('multi_shot_evidence_missing'));
  assert.ok(auditCinematicEvidence({shots:[baseline.shots[0],{...baseline.shots[1],id:'cinematic-1'}]}).failures.includes('shot_2_id_missing_or_duplicate'));
});
