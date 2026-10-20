/**
 * Evidence-bound cinematic/product-demo release check.
 * This module audits supplied evidence records; it cannot independently authenticate media.
 * It never approves publishing and never calls a provider.
 */
const HASH = /^sha256:[0-9a-f]{64}$/i;
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const isHash = value => typeof value === 'string' && HASH.test(value);
export function auditCinematicEvidence(input = {}) {
  const failures = [];
  const shots = Array.isArray(input.shots) ? input.shots : [];
  const seen = new Set();
  let cinematicCount = 0;
  let runtimeDemoCount = 0;
  if (shots.length < 2) failures.push('multi_shot_evidence_missing');
  for (let index = 0; index < shots.length; index += 1) {
    const shot = shots[index] || {};
    const prefix = `shot_${index + 1}`;
    if (!nonempty(shot.id) || seen.has(shot.id)) failures.push(`${prefix}_id_missing_or_duplicate`);
    if (nonempty(shot.id)) seen.add(shot.id);
    if (!isHash(shot.media_sha256)) failures.push(`${prefix}_media_hash_missing`);
    if (!Number.isFinite(shot.duration_seconds) || shot.duration_seconds <= 0) failures.push(`${prefix}_duration_invalid`);
    const evidence = shot.temporal_evidence || {};
    if (!nonempty(evidence.probe_receipt_id) || evidence.probed_media_sha256 !== shot.media_sha256 ||
        !nonempty(evidence.motion_review_receipt_id) ||
        !Number.isInteger(evidence.sampled_frames) || evidence.sampled_frames < 3 ||
        !Number.isInteger(evidence.distinct_frames) || evidence.distinct_frames < 3 ||
        evidence.distinct_frames > evidence.sampled_frames) failures.push(`${prefix}_temporal_evidence_missing`);
    if (shot.kind === 'cinematic') {
      cinematicCount += 1;
      if (!['recorded-video', 'generated-video'].includes(shot.source_type)) failures.push(`${prefix}_not_continuous_video_source`);
      if (shot.truth_class !== 'ILLUSTRATIVE' && shot.truth_class !== 'DRAMATIZED') failures.push(`${prefix}_cinematic_truth_class_invalid`);
      if (shot.disclosure_visible !== true) failures.push(`${prefix}_illustration_disclosure_missing`);
    } else if (shot.kind === 'product-demo') {
      runtimeDemoCount += 1;
      if (shot.source_type !== 'runtime-capture') failures.push(`${prefix}_runtime_capture_missing`);
      if (shot.truth_class !== 'DEMONSTRATED') failures.push(`${prefix}_runtime_truth_class_invalid`);
      if (!nonempty(shot.runtime_source_sha) || !nonempty(shot.runtime_capture_receipt_id)) failures.push(`${prefix}_runtime_provenance_missing`);
    } else {
      failures.push(`${prefix}_unknown_shot_kind`);
    }
  }
  if (cinematicCount === 0) failures.push('cinematic_shot_missing');
  if (runtimeDemoCount === 0) failures.push('authentic_product_demo_missing');
  return Object.freeze({
    evidence_complete: failures.length === 0,
    evidence_authenticity_verified: false,
    authority_granted: false,
    failures: Object.freeze(failures)
  });
}
