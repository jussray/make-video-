import test from 'node:test';
import assert from 'node:assert/strict';
import { MAKEVIDEO_PROTOCOL_VERSION, makevideoFingerprint } from '../src/makevideoProtocol.js';
import { STORYENGINE_ADAPTER_CONTRACT_VERSION, assertStoryEngineProtocolHandshake } from '../src/storyEngineAdapter.js';

// Contract fixture mirrors the version and fingerprint symbols consumed by
// StoryEngine's mediaRouterDomainBridge and syncAvenueRendererBridge.
test('StoryEngine consumer symbol contract remains usable', () => {
  const result = assertStoryEngineProtocolHandshake({
    protocolVersion: MAKEVIDEO_PROTOCOL_VERSION,
    adapterVersion: STORYENGINE_ADAPTER_CONTRACT_VERSION
  });
  assert.equal(result.compatible, true);
  assert.equal(result.authorityGranted, false);
  const fingerprint = makevideoFingerprint('sync-avenue-renderer-direction', {
    bridge_version: 'sync-avenue-renderer-bridge/v0.1.0',
    shot_id: 'shot-001',
    world_state_fingerprint: 'world-fixture',
    founder_intent_semantics_fingerprint: null,
    causal_lines: []
  });
  assert.equal(typeof fingerprint, 'string');
  assert.ok(fingerprint.length > 0);
});
