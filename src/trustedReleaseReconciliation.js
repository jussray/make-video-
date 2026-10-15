import { auditReleaseEvidence } from './releaseEvidenceGate.js';

// This boundary accepts only a trusted caller's *verification result*.
// It does not authenticate callers, resolve receipts, or grant approval.
export function reconcileTrustedReleaseEvidence(input = {}) {
  const audit = auditReleaseEvidence(input.release_evidence || {});
  const attestation = input.attestation || {};
  const fail = [];
  if (input.trusted_boundary !== true) fail.push('trusted_boundary_not_established');
  if (attestation.verifier !== 'FCR' && attestation.verifier !== 'StoryEngine') fail.push('verifier_not_recognized');
  if (attestation.authenticated !== true) fail.push('attestation_not_authenticated');
  if (typeof attestation.receipt_id !== 'string' || !attestation.receipt_id.trim()) fail.push('attestation_receipt_missing');
  if (typeof attestation.media_sha256 !== 'string' || attestation.media_sha256 !== input.release_evidence?.media?.sha256) fail.push('attestation_media_mismatch');
  if (attestation.exact_head_sha !== input.expected_head_sha || !/^[a-f0-9]{40}$/.test(input.expected_head_sha || '')) fail.push('head_mismatch');
  return Object.freeze({
    media_evidence_complete: audit.media_evidence_complete,
    release_evidence_complete: audit.publication_evidence_complete,
    attestation_fields_consistent: fail.length === 0,
    evidence_authenticity_verified: false,
    authority_granted: false,
    failures: Object.freeze([...audit.failures, ...fail])
  });
}
