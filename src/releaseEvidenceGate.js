import { rawSha256 } from './makevideoProtocol.js';

// Evidence validator only. Never grants or verifies the caller's authority.
export function auditReleaseEvidence(input = {}) {
  const failures = [];
  const media = input.media || {};
  const review = input.review || {};
  const approval = input.publish_approval || {};
  const publication = input.publication || {};
  const isHash = value => {
    try { rawSha256(value); return true; } catch { return false; }
  };
  if (!isHash(media.sha256)) failures.push('media_hash_missing');
  if (!Number.isFinite(media.duration_seconds) || media.duration_seconds <= 0) failures.push('media_duration_invalid');
  if (!Number.isInteger(media.width) || media.width <= 0 || !Number.isInteger(media.height) || media.height <= 0) failures.push('media_dimensions_invalid');
  if (typeof media.codec !== 'string' || !media.codec.trim()) failures.push('media_codec_missing');
  if (review.technical_passed !== true) failures.push('technical_review_missing');
  if (review.human_passed !== true) failures.push('human_review_missing');
  if (review.rights_passed !== true) failures.push('rights_review_missing');
  if (review.truth_passed !== true) failures.push('truth_review_missing');
  if (review.continuity_passed !== true) failures.push('continuity_review_missing');
  if (!isHash(review.media_sha256) || review.media_sha256 !== media.sha256) failures.push('review_media_mismatch');
  const mediaVerified = failures.length === 0;
  const publishApproved = mediaVerified &&
    approval.authorized === true &&
    typeof approval.approval_id === 'string' && approval.approval_id.trim().length > 0 &&
    approval.media_sha256 === media.sha256 &&
    approval.scope === 'publish';
  const published = publishApproved &&
    typeof publication.platform === 'string' && publication.platform.trim().length > 0 &&
    typeof publication.platform_id === 'string' && publication.platform_id.trim().length > 0 &&
    publication.media_sha256 === media.sha256 &&
    typeof publication.receipt_id === 'string' && publication.receipt_id.trim().length > 0;
  if (mediaVerified && !publishApproved) failures.push('publish_authorization_unverified');
  if (publishApproved && !published) failures.push('publication_receipt_missing');
  return Object.freeze({
    media_evidence_complete: mediaVerified,
    publish_approval_evidence_complete: publishApproved,
    publication_evidence_complete: published,
    authority_granted: false,
    failures: Object.freeze(failures)
  });
}
