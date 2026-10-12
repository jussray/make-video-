# Founder knowledge and provenance manifest

Status: conversation-derived intent, NOT independent runtime proof. Recorded 2026-10-10.

## Authority and origin
Founder discussions predate some repository implementations. This manifest preserves relevant intent and corrections as **conversation-derived** rather than asserting a specific historical message URL or timestamp. Source of implementation truth remains the actual repository at a pinned commit. Any other AI must treat this as context, not executable authority or permission to deploy.

## Portfolio interfaces
- ULTRATHINK/juss-os governs authority, evidence, rollback, and receipts; it is not the creative renderer.
- Founder Control Room (FCR) governs approvals, cross-project state, release evidence and outcomes; does not absorb peer engines.
- Chief advises on bounded strategy; SolContinuity is a separate peer intelligence system; PromptOS stores eligible reusable patterns.
- Product repositories own product-specific truth and assets. Council Bus may exchange authorized, provenance-marked summaries, not unrestricted private conversations.

## Reconciliation policy
Each claim must carry: origin_kind (conversation/repository/runtime/other_agent), origin_ref (or UNKNOWN), observed_at, exact_repo_and_sha (if code), confidence_state (VERIFIED/INFERRED/UNKNOWN/BLOCKED), supersedes, approval_scope, and evidence_refs. Do not invent citations, dates, working features, or approvals. A remembered decision is not deployed functionality. Conflicts remain open until founder or evidence resolves them.

## Known gaps
No complete conversation archive was independently enumerated in this export. Other-agent histories and source trees were not exhaustively audited. Rendering, CI, Playwright, deployments and organization transfer remain unverified.

## Gate
Before merge: reconcile against current source, inspect diff and checks, run focused tests and applicable real-path witness. Keep main untouched until verified. Rollback: revert manifest commit or delete export branch.

## Make Video-specific founder context
- Intended production chain includes scene planning, shot continuity, rendering, audio, QA and release receipts.
- Conversation-derived architecture treats LEEVIZE (visual/artwork) and Sync Avenue (temporal/motion) as peer engines, not interchangeable labels. Their current code, ownership and integration remain UNKNOWN until source inspection.
- Rendered video and real-path playback must be inspected before production claims.

## Cross-repository source reconciliation (2026-10-12)
- VERIFIED: `jussray/StoryEngine/story-engine/lib/makevideoProtocol.js` and this repository's `src/makevideoProtocol.js` returned the identical Git blob SHA `e5c8a61f9fe6ac29fc308f26a945714cbd090106` on direct connector reads. This proves byte-identical protocol source at the inspected refs, not package integration or a passing test.
- VERIFIED: StoryEngine contains `story-engine/lib/openVideoRenderer.js` (observed blob `54bceeff707a6a1a722b4da170ed29f58a983da3`), `story-engine/test/openVideoRenderer.test.js` (observed blob `c34d249706b982492340b04e6b548392f907a7c7`), and a Playwright workflow at `.github/workflows/story-video-engine-playwright.yml`. These are source-presence observations only.
- VERIFIED: The MAKEVIDEO export branch `export/make-video-contract` was 15 commits ahead of `main` and zero behind at the observed comparison; PR #1 remained open with a documentation-only, do-not-merge-until-verified description. This comparison is not a current-head lease.
- VERIFIED: The local StoryEngine adapter contract checks protocol and adapter versions and explicitly returns `authorityGranted: false`. It is not a renderer or publishing integration.
- NOT VERIFIED: exact current PR head, CI pass/fail, live ComfyUI/GPU availability, actual media bytes, playback, YouTube channel identity, upload authorization, or deployment.
- NEXT GATE: obtain exact-head CI and StoryEngine focused-test results, inspect a real rendered media receipt and playback, then separately verify release authorization before merging or publishing. Preserve StoryEngine's renderer ownership; do not duplicate it in MAKEVIDEO.
