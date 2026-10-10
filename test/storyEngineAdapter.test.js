import test from 'node:test';
import assert from 'node:assert/strict';
import { assertStoryEngineProtocolHandshake, STORYENGINE_ADAPTER_CONTRACT_VERSION } from '../src/storyEngineAdapter.js';
import { MAKEVIDEO_PROTOCOL_VERSION } from '../src/makevideoProtocol.js';

test('matching versions negotiate compatibility without granting authority', () => {
  const result = assertStoryEngineProtocolHandshake({protocolVersion: MAKEVIDEO_PROTOCOL_VERSION, adapterVersion: STORYENGINE_ADAPTER_CONTRACT_VERSION});
  assert.equal(result.compatible, true);
  assert.equal(result.authorityGranted, false);
  assert.equal(Object.isFrozen(result), true);
});

test('missing or unsupported protocol and adapter versions fail closed', () => {
  for (const value of [undefined, null, {}, [], {protocolVersion:'makevideo/v999',adapterVersion:STORYENGINE_ADAPTER_CONTRACT_VERSION}, {protocolVersion:MAKEVIDEO_PROTOCOL_VERSION,adapterVersion:'storyengine/v999'}]) {
    assert.throws(() => assertStoryEngineProtocolHandshake(value), TypeError);
  }
});
