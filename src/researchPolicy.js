// First-party research URL gate. This is validation, not a network fetcher.
// Resolve DNS and enforce public-address policy again at the actual network boundary.
import { isIP } from 'node:net';

const BLOCKED_HOSTS = new Set(['localhost', 'localhost.localdomain', 'metadata.google.internal']);
// Reserved and non-global IPv4 ranges. The URL gate is only a preflight;
// a network-isolated fetcher must separately validate resolved addresses and redirects.
const BLOCKED_CIDRS = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10],
  ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]
];

function ipv4Number(address) {
  return address.split('.').reduce((value, octet) => ((value * 256) + Number(octet)) >>> 0, 0);
}

function blockedIpv4(host) {
  const address = ipv4Number(host);
  return BLOCKED_CIDRS.some(([network, bits]) => {
    const mask = (0xffffffff << (32 - bits)) >>> 0;
    return (address & mask) === (ipv4Number(network) & mask);
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
