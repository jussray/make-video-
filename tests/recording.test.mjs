import test from 'node:test';
import assert from 'node:assert/strict';
import { addWebmDuration, preferredVideoType, extensionForVideoType, finalizeVideoBlob } from '../assets/recording.js';

const base = Uint8Array.from(Buffer.from('1a45dfa3801853806701ffffffffffffff1549a966872ad7b1830f42401f43b67501ffffffffffffff','hex'));
function scan(bytes, pattern) { return Buffer.from(bytes).indexOf(Buffer.from(pattern, 'hex')); }

test('chooses browser-supported video containers and matching extensions', () => {
  assert.equal(preferredVideoType({isTypeSupported: type => type==='video/mp4'}), 'video/mp4');
  assert.equal(preferredVideoType({isTypeSupported: type => type==='video/webm;codecs=vp8'}), 'video/webm;codecs=vp8');
  assert.equal(preferredVideoType({isTypeSupported: () => false}), null);
  assert.equal(extensionForVideoType('video/mp4;codecs=avc1'), 'mp4');
  assert.throws(() => extensionForVideoType('video/unknown'), /Unsupported/);
});

test('writes WebM duration without changing recorded cluster bytes', () => {
  const fixed = addWebmDuration(base, 3000);
  assert.equal(fixed.length, base.length+11);
  const marker = scan(fixed, '448988');
  assert.notEqual(marker, -1);
  assert.equal(new DataView(fixed.buffer, fixed.byteOffset, fixed.byteLength).getFloat64(marker+3,false), 3000);
  assert.equal(scan(fixed, '1f43b675'), scan(base, '1f43b675')+11);
  assert.equal(fixed[scan(fixed, '1549a966')+4],0x92);
});

test('refuses malformed and indexed recordings rather than corrupting them', () => {
  assert.throws(() => addWebmDuration(new Uint8Array([1,2,3]), 3000));
  assert.throws(() => addWebmDuration(base, 0), /duration/);
  const indexed=new Uint8Array([...base,0x11,0x4d,0x9b,0x74]);
  assert.throws(() => addWebmDuration(indexed, 1000), /Indexed WebM/);
});

test('keeps original bytes for unsupported WebM and preserves MP4', async () => {
  const invalid=new Blob([Uint8Array.of(1,2,3)],{type:'video/webm'});
  const fallback=await finalizeVideoBlob(invalid, 5000);
  assert.equal(fallback.durationPatched,false);
  assert.equal(fallback.blob,invalid);
  const mp4=new Blob([Uint8Array.of(1,2,3)],{type:'video/mp4'});
  const preserved=await finalizeVideoBlob(mp4,2000);
  assert.equal(preserved.blob,mp4);
  assert.equal(preserved.extension,'mp4');
});
