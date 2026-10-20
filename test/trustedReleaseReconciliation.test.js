import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileTrustedReleaseEvidence } from '../src/trustedReleaseReconciliation.js';

const hash = 'sha256:' + 'a'.repeat(64);
const head = 'b'.repeat(40);
const release_evidence = {
  media: { sha256: hash, asset_id: 'asset', storage_ref: 'store', duration_seconds: 3, width: 720, height: 1280, codec: 'h264' },
  evidence: { probe_receipt_id: 'probe', probed_media_sha256: hash, playback_receipt_id: 'playback', playback_media_sha256: hash },
  review: { review_receipt_id: 'review', technical_passed: true, human_passed: true, rights_passed: true, truth_passed: true, continuity_passed: true, media_sha256: hash },
  publish_approval: { authorized: true, approval_id: 'approval', approver_id: 'founder', authorization_receipt_id: 'auth', expires_at: '2099-01-01T00:00:00Z', scope: 'publish', media_sha256: hash },
  publication: { platform: 'youtube', platform_id: 'video', receipt_id: 'publish', provider_confirmation_ref: 'provider', media_sha256: hash }
};
const base = { trusted_boundary: true, expected_head_sha: head, release_evidence, attestation: { verifier: 'FCR', authenticated: true, receipt_id: 'attestation', media_sha256: hash, exact_head_sha: head } };
test('even a fully supplied attestation cannot self-grant authenticity or authority', () => {
  const result = reconcileTrustedReleaseEvidence(base);
  assert.equal(result.attestation_fields_consistent, true);
  assert.equal(result.release_evidence_complete, true);
  assert.equal(result.evidence_authenticity_verified, false);
  assert.equal(result.authority_granted, false);
});
test('untrusted caller and forged head fail closed', () => {
  const result = reconcileTrustedReleaseEvidence({ ...base, trusted_boundary: false, attestation: { ...base.attestation, exact_head_sha: 'c'.repeat(40) } });
  assert.equal(result.attestation_fields_consistent, false);
  assert.ok(result.failures.includes('trusted_boundary_not_established'));
  assert.ok(result.failures.includes('head_mismatch'));
});
test('missing attestation cannot authenticate supplied release receipts', () => {
  const result = reconcileTrustedReleaseEvidence({ ...base, attestation: {} });
  assert.equal(result.attestation_fields_consistent, false);
  assert.equal(result.evidence_authenticity_verified, false);
});
