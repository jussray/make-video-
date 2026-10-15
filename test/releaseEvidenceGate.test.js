import test from 'node:test';
import assert from 'node:assert/strict';
import { auditReleaseEvidence } from '../src/releaseEvidenceGate.js';

const hash = 'sha256:' + 'a'.repeat(64);
const base = {
  media: { sha256: hash, asset_id: 'asset-1', storage_ref: 'store/asset-1', duration_seconds: 12, width: 1920, height: 1080, codec: 'h264' },
  evidence: { probe_receipt_id: 'probe-1', probed_media_sha256: hash, playback_receipt_id: 'playback-1', playback_media_sha256: hash },
  review: { review_receipt_id: 'review-1', technical_passed: true, human_passed: true, rights_passed: true, truth_passed: true, continuity_passed: true, media_sha256: hash },
  publish_approval: { authorized: true, approval_id: 'approved-1', approver_id: 'founder', authorization_receipt_id: 'auth-1', expires_at: '2099-01-01T00:00:00Z', scope: 'publish', media_sha256: hash },
  publication: { platform: 'youtube', platform_id: 'video-1', receipt_id: 'receipt-1', provider_confirmation_ref: 'provider-confirm-1', media_sha256: hash }
};
test('complete release evidence remains evidence only, never an authority grant', () => {
  const result = auditReleaseEvidence(base);
  assert.equal(result.media_evidence_complete, true);
  assert.equal(result.publish_approval_evidence_complete, true);
  assert.equal(result.publication_evidence_complete, true);
  assert.equal(result.authority_granted, false);
  assert.deepEqual(result.failures, []);
});
test('missing media and reviews fail closed', () => {
  const result = auditReleaseEvidence({});
  assert.equal(result.media_evidence_complete, false);
  assert.equal(result.publication_evidence_complete, false);
  assert.ok(result.failures.includes('media_hash_missing'));
});
test('media review must bind exact bytes', () => {
  const result = auditReleaseEvidence({ ...base, review: { ...base.review, media_sha256: 'sha256:' + 'b'.repeat(64) } });
  assert.equal(result.media_evidence_complete, false);
  assert.equal(result.publish_approval_evidence_complete, false);
  assert.equal(result.publication_evidence_complete, false);
  assert.ok(result.failures.includes('review_media_mismatch'));
});
test('approval cannot be inferred from verified media', () => {
  const result = auditReleaseEvidence({ ...base, publish_approval: {} });
  assert.equal(result.media_evidence_complete, true);
  assert.equal(result.publish_approval_evidence_complete, false);
  assert.equal(result.publication_evidence_complete, false);
});
test('publishing needs a platform receipt bound to the media', () => {
  const result = auditReleaseEvidence({ ...base, publication: { ...base.publication, media_sha256: 'sha256:' + 'b'.repeat(64) } });
  assert.equal(result.publish_approval_evidence_complete, true);
  assert.equal(result.publication_evidence_complete, false);
  assert.ok(result.failures.includes('publication_receipt_missing'));
});
test('non-positive duration and zero dimensions fail validation', () => {
  const result = auditReleaseEvidence({ ...base, media: { ...base.media, duration_seconds: 0, width: 0 } });
  assert.equal(result.media_evidence_complete, false);
  assert.ok(result.failures.includes('media_duration_invalid'));
  assert.ok(result.failures.includes('media_dimensions_invalid'));
});

test('probe and playback receipts are required for media verification', () => {
  const result = auditReleaseEvidence({ ...base, evidence: {} });
  assert.equal(result.media_evidence_complete, false);
  assert.ok(result.failures.includes('media_probe_unverified'));
  assert.ok(result.failures.includes('media_playback_unverified'));
});
test('expired approval never counts as publication authorization', () => {
  const result = auditReleaseEvidence({ ...base, publish_approval: { ...base.publish_approval, expires_at: '2020-01-01T00:00:00Z' } });
  assert.equal(result.media_evidence_complete, true);
  assert.equal(result.publish_approval_evidence_complete, false);
});
test('unconfirmed provider publication is not proven', () => {
  const result = auditReleaseEvidence({ ...base, publication: { ...base.publication, provider_confirmation_ref: '' } });
  assert.equal(result.publication_evidence_complete, false);
});
test('self-reported receipts never verify authenticity or grant authority', () => {
  const result = auditReleaseEvidence(base);
  assert.equal(result.evidence_authenticity_verified, false);
  assert.equal(result.authority_granted, false);
});
