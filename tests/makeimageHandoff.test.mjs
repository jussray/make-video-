import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { verifyMakeImageReceipt, importMakeImageFiles } from '../assets/makeimageHandoff.js';

if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto;

function fixture() {
  // Only a PNG IHDR header is needed for SHA/integrity unit tests.
  // Actual decoding is exercised by existing browser image-flow tests.
  const bytes = new Uint8Array(33);
  bytes.set([137,80,78,71,13,10,26,10], 0);
  bytes.set([0,0,0,13,73,72,68,82], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 640);
  view.setUint32(20, 360);
  const sha = createHash('sha256').update(bytes).digest('hex');
  const receipt = {
    schema: 'makeimage/local-composite/v1',
    state: 'VERIFIED_LOCAL_RENDER',
    output: { format: 'PNG', sha256: sha, width: 640, height: 360 },
    continuity_fingerprint: 'a'.repeat(64),
    continuity_cookie: { publish_authority: false }
  };
  return { bytes, receipt };
}

test('matching receipt returns source digest and non-authorizing continuity note', async () => {
  const {bytes,receipt} = fixture();
  const result = await verifyMakeImageReceipt(bytes.buffer,receipt);
  assert.equal(result.digest,receipt.output.sha256);
  assert.match(result.continuity,/publication are not verified/);
});

test('rejects changed pixels, unsupported states, mismatched dimensions, and authority', async () => {
  const {bytes,receipt} = fixture();
  const changed = bytes.slice();
  changed[30] ^= 1;
  await assert.rejects(verifyMakeImageReceipt(changed.buffer,receipt),/do not match/);
  await assert.rejects(verifyMakeImageReceipt(bytes.buffer,{...receipt,state:'PUBLISHED'}),/proof format/);
  await assert.rejects(verifyMakeImageReceipt(bytes.buffer,{...receipt,output:{...receipt.output,width:123}}),/dimensions/);
  await assert.rejects(verifyMakeImageReceipt(bytes.buffer,{...receipt,continuity_cookie:{publish_authority:true}}),/proof format/);
});

test('rejects fake PNG headers and malformed receipts without modifying project', async () => {
  const {bytes,receipt} = fixture();
  const invalid = bytes.slice();
  invalid[0] = 0;
  await assert.rejects(verifyMakeImageReceipt(invalid.buffer,receipt),/PNG header/);
  await assert.rejects(verifyMakeImageReceipt(bytes.buffer,{}),/proof format/);
});

test('file adapter checks receipt then invokes original image optimizer', async () => {
  const {bytes,receipt} = fixture();
  const file = { type: 'image/png',size: bytes.length,arrayBuffer: async () => bytes.buffer };
  const proofFile = { size: 800,text: async () => JSON.stringify(receipt) };
  const result = await importMakeImageFiles(file,proofFile,'9:16',async (_image,format) => {
    assert.equal(format,'9:16');
    return 'data:image/jpeg;base64,AAAA';
  });
  assert.equal(result.imageData,'data:image/jpeg;base64,AAAA');
  await assert.rejects(importMakeImageFiles(file,{size:20,text:async()=>'{'}),/valid JSON/);
});
