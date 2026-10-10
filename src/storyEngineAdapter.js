import { MAKEVIDEO_PROTOCOL_VERSION } from './makevideoProtocol.js';

export const STORYENGINE_ADAPTER_CONTRACT_VERSION = 'storyengine-makevideo-adapter/v1';

/** Validate compatibility only. This does not grant authority or execute jobs. */
export function assertStoryEngineProtocolHandshake(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('A version handshake object is required.');
  }
  if (input.protocolVersion !== MAKEVIDEO_PROTOCOL_VERSION) {
    throw new TypeError('Unsupported MAKEVIDEO protocol version.');
  }
  if (input.adapterVersion !== STORYENGINE_ADAPTER_CONTRACT_VERSION) {
    throw new TypeError('Unsupported StoryEngine adapter version.');
  }
  return Object.freeze({
    protocolVersion: MAKEVIDEO_PROTOCOL_VERSION,
    adapterVersion: STORYENGINE_ADAPTER_CONTRACT_VERSION,
    compatible: true,
    authorityGranted: false
  });
}
