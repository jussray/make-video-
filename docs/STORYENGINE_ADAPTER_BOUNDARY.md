# MAKEVIDEO ↔ StoryEngine adapter boundary (candidate v1)

Status: **CONTRACT PROPOSAL, NOT A DEPLOYED INTEGRATION**.

## Ownership
- This repository owns the reusable `makevideo/v2.1` protocol, legal state transitions, fingerprints, evidence and receipt rules. Protocol exports live at `src/makevideoProtocol.js`.
- StoryEngine independently owns LEEVIZE rendering, media storage, job execution, project canon, UI, Sync Avenue synchronization and release operations. No StoryEngine renderer is copied into this package.
- A renderer/provider response is never proof of validated media, approval, publication or founder authority.

## Version handshake
Consumers MUST explicitly check `MAKEVIDEO_PROTOCOL_VERSION === 'makevideo/v2.1'` and declare their adapter version. Unsupported protocol versions fail closed; never silently reinterpret receipt formats.

## Integration direction
1. A StoryEngine adapter imports or packages the pinned protocol from this repository (future package/release wiring, not implemented yet).
2. It translates StoryEngine-owned objects to protocol objects, retaining project-specific IDs and provenance.
3. It records immutable job and receipt fingerprints; verifies legal transitions and receipt chains before accepting results.
4. It resolves approvals against its own authoritative records. Fingerprints and cookies are identifiers, **not authorization tokens**.
5. It keeps Sync Avenue's causal state and LEEVIZE's renderer lifecycle on the StoryEngine side of the boundary.
6. It fails closed on missing approvals, unverified media bytes, mismatched versions or absent receipt evidence.

## Existing integration evidence
Source inspected: `jussray/StoryEngine@6d6fe0d84464ceee783fa86543ab9a335f6f0246`.
- `story-engine/lib/mediaRouterDomainBridge.js` uses `MAKEVIDEO_PROTOCOL_VERSION` and `makevideoFingerprint` from its local protocol module.
- `story-engine/lib/syncAvenueRendererBridge.js` uses `makevideoFingerprint` and a StoryEngine event model.
- `story-engine/lib/openVideoRenderer.js` owns the renderer execution lane and imports StoryEngine job/continuity/event modules.

## Explicit nonclaims and next gates
- No published npm package, API service, StoryEngine dependency change, or runtime integration is claimed.
- No full dependency or security audit of StoryEngine has been completed.
- Before integrating: decide distribution method, test protocol version compatibility, verify existing StoryEngine regression tests, add adapter-specific contract tests, inspect licensing/rights, then review release authority.
- No deployment, billing, publication, merge or repository transfer is authorized by this document.
