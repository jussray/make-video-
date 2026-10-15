# MAKEVIDEO | Standalone capability boundary

Version: `makevideo/v2.1`. Owner: Juss. Status: protocol and contract tests exported; **rendering and publication are not implemented in this repository**.

## Source lineage and precedence
- Shared founder creative-production source: `jussray/ULTRATHINK-/.claude/skills/juss-af-skills-pack/SKILL.md`, v1.0.1, observed Git blob `d29849ef773c0cb31af062b5e121fe1f2f5289ec`. This source also owns /MAKEIMAGE, /advertise, and portfolio-wide creative governance. Do not copy that shared authority into this package.
- Video-specialized operating source: `jussray/StoryEngine/skills/makevideo/SKILL.md`, v2.1, observed Git blob `91675b279b3c46e9724db5a6e50ca0b938cd3324`.
- Executable video protocol: `src/makevideoProtocol.js` (observed blob `e5c8a61f9fe6ac29fc308f26a945714cbd090106`), byte-identical to StoryEngine's observed local protocol module.
- Existing StoryEngine adapter: `src/storyEngineAdapter.js` checks protocol/adapter version only and returns `authorityGranted: false`. Distribution/import wiring into StoryEngine is not yet proven.

## Mission
Translate founder intent into an evidence-bound, continuity-safe, inspectable multi-shot video. A video is not complete merely because a worker accepts a job or reports success. Use actual media inspection and release receipts. Keep the campaign's measurable CTA and money path.

## Video execution contract
1. Capture founder intent, audience, creative constraints, CTA, destination, conversion event, and money path. Classify all factual claims and their evidence.
2. Keep `CreativeCanon`, `EvidenceCanon`, and `ReleaseCanon` separate. Generated UI cannot prove real product behavior. Preserve people, wardrobe, location, props, UI, claim, audio, and story-clock continuity.
3. Create independent `ShotObjective`, `JobAttempt`, and `Release` lifecycles. Enforce the executable transition rules from the protocol; never infer release approval from a render result.
4. Compile immutable bounded jobs with protocol, adapter version, canon, source, asset hashes, expected outputs, retry ordinal, repair specification, and cost ceiling. Reserve authorized budget before paid work.
5. Persist accepted provider job identifiers and append-only, hash-chained receipts before further dependent actions. Reconcile an accepted job before retrying. Creative repair creates a new attempt and fingerprint.
6. Persist actual media bytes, hashes, duration, codec, frame and audio evidence. Run deterministic media validation; machine similarity scores are advisory only. Human review covers identity, truth, continuity, story, rights, and release fit.
7. Bind actual end-frame assets and state into continuity packets for successor shots. Fingerprints and continuity/proof cookies are non-secret identifiers, never authentication or authorization.
8. Assemble approved assets and inspect the finished video, including audio, captions, transitions, disclosures, and destination/platform requirements.
9. Separate `VERIFIED` finished-media state, `PUBLISH_APPROVED` human-authorized action, and `PUBLISHED` platform-confirmed receipt with actual platform ID/URL.
10. Capture outcome evidence and classify the pattern for COMPOUND / RETEST / REVISE / KILL. No fabricated metrics, reviews, prices, rights, or product capabilities.

## Ownership and release gate
- **MAKEVIDEO** owns protocol schemas, transitions, fingerprints, receipt validation, and reusable contract tests.
- **StoryEngine / LEEVIZE** owns render workers, storage, QA, UI, provider credentials, cost policy, and execution. **Sync Avenue** owns its motion/temporal domain.
- **FCR** owns cross-project authorization, release approvals, receipts, and portfolio evidence. Chief, Sol, and PromptOS remain separate peer systems.
- A passing protocol test does not prove live GPU rendering, real playback, platform upload, or permission to publish.
- Do not merge the export or claim a production-capable transfer until exact-head CI, StoryEngine integration/regressions, real render and playback evidence, rights review, and release authority are verified.

## Adversarial gates
Reject generic campaigns, unsupported claims, continuity drift, decorative fake UI, wrong audience, missing CTA/money path, unlicensed assets, external-copy dependence, unaccounted provider cost, stale proof cookies, duplicate retries, and fabricated publication state.

Report `REALITY / FIX / PROOF / RISK / ROLLBACK / NEXT GATE`. Each claim must identify its source and evidence state.
