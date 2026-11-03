// First-party research URL gate. This is validation, not a network fetcher.
// Resolve DNS and enforce public-address policy again at the actual network boundary.
import { isIP } from 'node:net';

const BLOCKED_HOSTS = new Set(['localhost', 'localhost.localdomain', 'metadata.google.internal']);
const PRIVATE_V4 = [
  [0, 8], [10, 8], [100, 10], [127, 8], [169, 16], [172, 12], [192, 16], [198, 15], [224, 4], [240, 4]
];

function blockedIpv4(host) {
  const octets = host.split('.').map(Number);
  if (octets.length !== 4 || octets.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const value = octets.reduce((acc, n) => (acc * 256 + n) >>> 0, 0);
  return PRIVATE_V4.some(([prefix, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    const network = prefix === 100 ? 0x64000000 : prefix === 172 ? 0xac000000 : prefix === 192 ? 0xc0000000 : prefix === 198 ? 0xc6000000 : prefix << 24;
    return (value & mask) === (network & mask);
  });
}

export function validateResearchUrl(input) {
  if (typeof input !== 'string' || input.length > 2048) throw new TypeError('Invalid research URL');
  let url;
  try { url = new URL(input); } catch { throw new TypeError('Invalid research URL'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.hash) {
    throw new TypeError('Research URL is not permitted');
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
  if (!host || BLOCKED_HOSTS.has(host) || host.endsWith('.localhost') || host.endsWith('.local') ||
      host.endsWith('.internal') || host.endsWith('.test') || !host.includes('.')) {
    throw new TypeError('Research destination is not public');
  }
  const family = isIP(host);
  if (family === 4 && blockedIpv4(host)) throw new TypeError('Research destination is not public');
  if (family === 6) throw new TypeError('Literal IPv6 destinations require network-boundary validation');
  if (url.port && !['80', '443'].includes(url.port)) throw new TypeError('Research port is not permitted');
  return url.toString();
}
