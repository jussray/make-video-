# Export self-audit and provenance receipt (2026-10-10)

## Verified
- The source contract is `jussray/ULTRATHINK-/.claude/skills/juss-af-skills-pack/SKILL.md`, version 1.0.1, containing both /makeimage and /makevideo triggers.
- The destination repository was initially a minimal README-only observed surface; the complete tree was NOT enumerated.
- A scoped `CAPABILITY.md` was committed on a dedicated export branch and read back via GitHub.
- Original source and destination `main` were not modified by these export commits.

## Confession / limitations
- Calling this a completed export of the *capability* was too broad. Only a concise, manually distilled contract was exported. No full implementation, reusable tests, asset pipeline, model integration, dependencies, or runtime were copied.
- The source contains a larger shared production contract (adoption gate, nine modules, scene state, claims, money path, platform adapters, continuity cookies, attack tests, production gates). The short destination contract is NOT equivalent to that complete source.
- No exhaustive repository tree, CI workflow, secret, webhook, branch protection, or deployment audit was performed.
- No Playwright or real render verification occurred. No passing tests, merge readiness, or runtime operation is claimed.
- No PR was opened; no transfer into JussAndCo was attempted.

## Corrective action / next gate
1. Preserve original source as authoritative until a full provenance and dependency map is reviewed.
2. Enumerate the source files and destination trees; distinguish shared kernel, image-only, video-only, and external integrations.
3. Export the complete relevant implementation without duplicating the governance kernel; add focused tests and run the actual rendering path, including Playwright where UI is involved.
4. Reconcile exact SHAs, review and CI status; obtain specific approval before merge or organization transfer.

## Classification
- Contract snapshot: VERIFIED (GitHub commit + readback)
- Functional capability transfer: NOT VERIFIED
- Runtime rendering: UNKNOWN
- CI and browser evidence: NOT RUN
- Organization migration: NOT STARTED

## Rollback
Delete the dedicated export branch; do not delete or alter the ULTRATHINK source.

## Updated evidence and adversarial gate (2026-10-12)
This section supersedes older **time-bound** statements above; historical observations remain intact.
- VERIFIED: Export branch was 16 commits ahead of `main`, zero behind, on comparison; this is not a lease on the current head.
- VERIFIED: MAKEVIDEO protocol CI run `38311838036` completed successfully at commit `851dfb7af577298f25b8644eaf17d97641ae32a2`, with `npm test` successful on Node 22 and 24. This verifies the standalone contract test suite only.
- VERIFIED: StoryEngine and MAKEVIDEO protocol modules share exact Git blob SHA `e5c8a61f9fe6ac29fc308f26a945714cbd090106` at inspected refs. StoryEngine retains the ComfyUI renderer, and its `.github/workflows/story-video-engine-playwright.yml` includes Node tests, browser checks, and video-composition tests; presence is not execution proof.
- ATTACK: CI success must not be promoted into `MEDIA_VALIDATED`, `VERIFIED`, `PUBLISH_APPROVED`, or `PUBLISHED` state. Protocol fingerprints and continuity cookies are not authority tokens.
- ATTACK: A Playwright run with mocked GPU responses is not proof of actual rendered bytes or playback. Require media hashes, codec/probe validation, inspected frames/audio/captions, source/rights checks, and an exact-job receipt.
- ATTACK: The previous audit's claim that no PR existed is superseded: PR #1 was observed open with a do-not-merge gate. No verified current PR mergeability or production deployment is claimed.
- BLOCKED: full source capability parity, StoryEngine exact-head regression evidence, GPU render, release authorization, and YouTube publishing remain unverified.
- NEXT: Reconcile the original ULTRATHINK source modules and all dependencies before calling this a full export. Keep PR #1 unmerged until functional and authorization gates are independently verified.
