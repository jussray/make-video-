import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAudioFile, MAX_AUDIO_BYTES } from '../assets/audio.js';
import { preferredVideoType } from '../assets/recording.js';

test('accepts bounded creator-selected audio files without handling external URLs', () => {
  assert.equal(validateAudioFile({type:'audio/wav',size:1000,name:'voice.wav'}),true);
  assert.equal(validateAudioFile({type:'audio/mpeg',size:1000,name:'original.mp3'}),true);
  assert.equal(validateAudioFile({type:'',size:1000,name:'recording.m4a'}),true);
});
test('rejects bad audio content types, oversized and empty selections', () => {
  assert.throws(()=>validateAudioFile({type:'application/javascript',name:'x.js',size:100}),/supported/);
  assert.throws(()=>validateAudioFile({type:'audio/wav',name:'x.wav',size:MAX_AUDIO_BYTES+1}),/12 MB/);
  assert.throws(()=>validateAudioFile({type:'audio/wav',name:'x.wav',size:2}),/12 MB/);
  assert.throws(()=>validateAudioFile(null),/12 MB/);
});
test('requires audio-capable MediaRecorder container when audio is selected', () => {
  const recorder={isTypeSupported:type=>type==='video/webm;codecs=vp9,opus'||type==='video/webm;codecs=vp8'};
  assert.equal(preferredVideoType(recorder,true),'video/webm;codecs=vp9,opus');
  assert.equal(preferredVideoType(recorder,false),'video/webm;codecs=vp8');
  assert.equal(preferredVideoType({isTypeSupported:type=>type==='video/mp4'},true),'video/mp4');
  assert.equal(preferredVideoType({isTypeSupported:()=>false},true),null);
});
