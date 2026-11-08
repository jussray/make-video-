---
name: cinematic-image-to-code
description: "Implement approved original cinematic imagery into the existing Juss & Co image, video and game pipeline; render, compare, correct and verify with source-linked receipts."
---

# Cinematic image-to-code: source → implementation → proof

Use for /image2code, /makeskill, visual-to-production, new graphic assets, screenshot parity or cinematic game/video upgrades. This skill routes into THIS repository's existing production modules; **never** spin up a replacement studio, video engine, game, or control room.

## Fixed contract

1. Observe **current main HEAD**, working branch exact head and merge-base; name source asset, owner, rights/approval, route and existing tests. Reject stale evidence.
2. **Generate/reference → inspect → implement → render → compare → correct → verify.** Build in the existing renderer. Preserve the actual gameplay, scene timing, source work and approved visual fingerprint.
3. Keep **reference art**, **local generated composite**, **motion video**, **live software screenshot**, and **hardware 3D evidence** separate; do not mislabel a poster/background as GPU-rendered gameplay or a video as a recorded product demo.
4. Produce SHA-256/provenance/continuity evidence where the current pipeline supports it. Byte matching proves matching bytes, **not** copyright permission, a trusted creator, live motion, GPU performance, or publishing authority.
5. Verify the focused tests first; for interactive surfaces, run real desktop + mobile Playwright, inspect uncaught JS/console errors, asset loading, readable controls and a gameplay/shot flow. If hardware WebGL is unavailable, mark it BLOCKED and identify fallback proof independently.
6. Never silently merge/deploy/publish, incur paid model charges, override approved graphics, invent current performance or create duplicate PRs. Existing approvals do not replace fresh exact-head release gates.

## Reality/provenance receipt

Return **REALITY / FIX / PROOF / RISK / ROLLBACK / NEXT GATE** with main SHA, branch SHA, changed paths, asset hashes, actual screenshots and unresolved release gates. Source image ≠ runtime evidence.

## This repository: VIDEO consumer

- Existing studio: `assets/app.js`, `assets/model.js`, `assets/photo.js`, `assets/audio.js`; reuse them. `assets/makeimageHandoff.js` on the existing image-handoff PR checks local MakeImage PNG signature, dimensions and SHA against its receipt before importing as a shot.
- Existing release-evidence truth checks live at `src/cinematicEvidenceGate.js`. Distinguish illustrative/generated key art from continuous real motion and a runtime-captured product demo.
- Workflow: validate image+receipt → import storyboard/shot → compose approved timing/motion with existing studio → render preview → inspect scene-by-scene → Playwright on actual studio → produce non-publishing receipt.
- Tests: `npm test`, `npm run build`; for browser work use the existing `e2e/makevideo.spec.js` Playwright route. Do not claim a generated still has become recorded moving footage.
- Keep StoryEngine adapter bounded, with no silent writes/exports, model expenses or unauthorized publication.
