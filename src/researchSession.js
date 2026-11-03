// Standalone research orchestration. The injected worker must pin validated DNS
// addresses at connection time, disable automatic redirects, and isolate browser state.
// This module intentionally grants no network, shell, or publishing authority.
import { validateResearchUrl, validateResolvedResearchAddresses } from './researchPolicy.js';

export async function researchPage(url, { resolve, navigate, maxRedirects = 3 } = {}) {
  if (typeof resolve !== 'function' || typeof navigate !== 'function') {
    throw new TypeError('An isolated resolver and browser worker are required');
  }
  if (!Number.isInteger(maxRedirects) || maxRedirects < 0 || maxRedirects > 5) {
    throw new TypeError('Invalid redirect budget');
  }
  let current = validateResearchUrl(url);
  const visited = new Set();
  for (let redirect = 0; redirect <= maxRedirects; redirect++) {
    if (visited.has(current)) throw new Error('Research redirect loop');
    visited.add(current);
    const addressRecords = await resolve(new URL(current).hostname);
    const addresses = validateResolvedResearchAddresses(addressRecords);
    // Worker must guarantee it connects ONLY to one of these vetted IPs.
    const result = await navigate({ url: current, pinnedAddresses: addresses, redirects: 'manual' });
    if (!result || typeof result !== 'object') throw new Error('Invalid browser worker result');
    if (result.redirectUrl !== undefined) {
      if (typeof result.redirectUrl !== 'string' || redirect === maxRedirects) {
        throw new Error('Research redirect budget exceeded');
      }
      current = validateResearchUrl(new URL(result.redirectUrl, current).toString());
      continue;
    }
    if (typeof result.title !== 'string' || typeof result.text !== 'string') {
      throw new Error('Browser worker returned invalid content');
    }
    return Object.freeze({
      url: current,
      title: result.title.slice(0, 300),
      text: result.text.slice(0, 20_000),
      visited: [...visited],
      verifiedNetworkIsolation: false
    });
  }
  throw new Error('Research redirect budget exceeded');
}
