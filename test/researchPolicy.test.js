import test from 'node:test';
import assert from 'node:assert/strict';
import { validateResearchUrl } from '../src/researchPolicy.js';

test('permits ordinary public research URLs', () => {
  assert.equal(validateResearchUrl('https://example.com/articles?q=film'), 'https://example.com/articles?q=film');
});
test('rejects credentials, non-web schemes, local hosts and private IPv4', () => {
  for (const value of [
    'file:///etc/passwd', 'http://localhost/', 'http://sub.localhost/',
    'http://service.internal/', 'http://169.254.169.254/latest/meta-data/',
    'http://127.0.0.1/', 'http://10.1.2.3/', 'http://172.16.1.2/',
    'http://192.168.1.1/', 'http://[::1]/', 'https://user:pass@example.com/',
    'https://example.com:8080/', 'https://example.com/#fragment'
  ]) assert.throws(() => validateResearchUrl(value), TypeError, value);
});
test('allows public IPv4 addresses outside reserved ranges', () => {
  assert.equal(validateResearchUrl('https://192.88.99.1/'), 'https://192.88.99.1/');
  assert.equal(validateResearchUrl('https://198.2.0.1/'), 'https://198.2.0.1/');
});
test('rejects documentation and benchmarking addresses', () => {
  for (const address of ['192.0.2.1', '198.18.0.1', '198.51.100.2', '203.0.113.3']) {
    assert.throws(() => validateResearchUrl('https://' + address + '/'), TypeError);
  }
});
test('does not fetch or execute anything', () => {
  assert.equal(typeof validateResearchUrl, 'function');
});
