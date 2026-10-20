# MakeVideo | Juss & Co.

Standalone web studio for drafting shot-by-shot storyboards, previewing animated text/color shots and exporting a **real WebM or MP4 animatic** directly in the browser. Storyboards are saved in the device's local storage and can be imported/exported as JSON.

**Boundaries:** This is a browser storyboard/animatic tool, **not** the production AI renderer. The v2.1 MAKEVIDEO production protocol and StoryEngine adapter are source-level contracts with independent tests, not a deployed provider runtime. StoryEngine/LEEVIZE own provider rendering; FCR owns publication authority. No secrets, payment processing, uploads, external API integrations or automatic publication are used by this frontend. No user data leaves the browser.

## Source-labeled interactive-experience walkthroughs

The existing studio can now turn a structured `jussco/visual-experience/v1` JSON manifest into editable storyboard shots. Choose **Visual walkthrough** for a frozen Juss & Co. example or **Experience JSON** to import your own architecture, playtest-flow, or visual canon inspection. This uses the **same** preview, editor, and actual browser WebM/MP4 animatic export; it does not install a parallel studio.

The source claims in the supplied manifest are **not** live GitHub verification. The sample is a frozen public-source snapshot, not a release dashboard. Every item requires one of `VERIFIED_SOURCE / INFERRED / UNKNOWN / BLOCKED`; invalid statuses, duplicate IDs, invalid edges, and oversized files fail closed. An item labeled `VERIFIED_SOURCE` means only the **manifest author** marked its source inspected; MakeVideo does not verify or authorize the claim.

Imported visuals initially use animated text/color shots; add your rights-cleared screenshots through the existing **SHOT IMAGE** input to make an image-backed walkthrough, then export the animatic. Importing asks before replacing locally saved projects. Existing footage, studio animations, browser privacy and publication boundaries remain intact. Static image production is owned separately by MakeImage. Independent browser verification of the real target remains a release gate.

## Local verification

```sh
npm ci
npm test
npm run build
```

Cloudflare Pages: production branch `main`, root `/`, build command `npm run build`, build output `dist`. The generated `dist` is a static site and needs no server.

The animatic exports locally animated frames and optional images, with optional creator-owned soundtrack audio. Chrome-like WebM recordings receive explicit duration metadata where the container layout is safely supported; an unsupported layout is returned unchanged with a review warning. Browser-supported MP4 recording is enabled for compatible devices. This does not establish real-world rendered media quality, asset rights, or permission to publish.

## Local image shots

Each shot can optionally use a PNG, JPEG or WebP image supplied by the creator. The browser crops/compresses it into a bounded embedded JPEG (approximately 75 KB or less) and applies a subtle slow zoom during playback and video export. Media never uploads to an external server. The storyboard JSON contains embedded images, so treat exports as potentially private files and share only deliberately. Use only assets you have rights to. The 24-shot and per-project storage limits prevent unlimited browser storage consumption. Removing a shot image restores the abstract animated-background rendering.


## Clear saved local project
The studio stores work in this browser's local storage. The **Clear local saved project** control requires confirmation, replaces the active project with a blank storyboard, and clears the in-memory photo cache. This does not delete JSON/video files the creator explicitly downloaded or clear other sites' data. Data stored by the browser is not encrypted by this application, so use the clearing control on shared devices.

## Local audio export
Add a creator-owned or otherwise licensed WAV, MP3, M4A, AAC, OGG, or WebM soundtrack from your device (maximum 12 MiB, maximum 300 decoded seconds). Files are read in memory and never uploaded or embedded in the saved storyboard JSON. After reload, select the file again. The editor preview is intentionally muted; export includes the selected audio track and a volume slider. A shorter track stops before the video's end (no repeat); a longer track is truncated to the video length. Unsupported browsers fail visibly instead of quietly replacing a requested soundtrack with silence. The **Clear local saved project** control also removes the session-only soundtrack selection.

Actual audio codecs depend on the browser's MediaRecorder support. Always inspect and listen to the exported video. This feature does not grant permission to use third-party copyrighted music.

## Verified local motion-video flow (`demo.py`)

The browser studio remains a **local storyboard and animatic editor**. An additional independent Python/FFmpeg video path now accepts creator-owned **actual moving video files** (not static photographs or color slides), preserves native source audio where present, fills missing audio with silence, optionally mixes a locally supplied licensed soundtrack, and renders a H.264/AAC MP4 with measured duration. The edit produces a JSON release-evidence receipt and a source-bound SHA-256 continuity fingerprint; it never claims AI-video generation or permission to publish.

```bash
# Prerequisites: Python 3.10+, FFmpeg / FFprobe with libx264 and AAC enabled.
python3 demo.py \
  --clips ./footage/shot-01.mp4 ./footage/shot-02.mp4 \
  --output ./out/cinematic-cut.mp4 \
  --receipt ./out/cinematic-cut.receipt.json

# Optional rights-cleared local soundtrack:
python3 demo.py \
  --clips ./footage/shot-01.mp4 ./footage/shot-02.mp4 \
  --soundtrack ./audio/licensed-score.wav \
  --output ./out/cinematic-cut-with-audio.mp4 \
  --receipt ./out/cinematic-cut-with-audio.receipt.json
```

A bounded frame-change probe also rejects clips that appear completely static in their opening samples. Frame changes **do not** prove genuine filmed action: slow-zoom slideshows and fabricated UI may still change pixels, so source identity and actual footage remain subject to human review.

**Actual flow:** `licensed footage -> ffprobe input validation -> encode/crop/trim and concatenate real moving frames + native audio -> ffprobe output verification -> output SHA-256 + continuity receipt -> human audiovisual review -> separate release authority`. Rejects missing/bad inputs, unexpected duration, unsupported containers, oversized or overlong submissions (total <179 seconds), non-H.264/AAC output, and any attempt to overwrite originals or previous outputs. Does not generate or purchase footage; bring approved clips from your real camera, screen recording, or authorized provider outputs. It does not turn the browser's photo-based animatic into a cinematic film. This explicit boundary prevents a slow-zoom slideshow from being labeled a completed moving-action demonstration.

```bash
python3 -m unittest discover -s demo_tests -v
```

This Python motion-render test is also included in the existing GitHub Actions studio check. It exercises the real FFmpeg encoder, probes MP4 video + audio streams and verifies the source-bound proof receipt; this is different from the original browser's WebM/MP4 animatic tests. External provider integration and visual inspection of each copyrighted shot still require separate gates.
## MAKEVIDEO v2.1: protocol and cinematic evidence boundary

The `src/` and `test/` modules define the `makevideo/v2.1` protocol, evidence transitions, continuity fingerprints and release reconciliation. They do **not** execute AI provider jobs, independently authenticate runtime footage, or grant permission to publish. StoryEngine remains a separate peer product.

The general `demo.py` is the verified local creator-footage editor. The separate `examples/cinematic_product_demo.py` composes a disclosed illustrative scene followed by a purported runtime screen capture, producing an evidence receipt with **runtime authenticity UNKNOWN** until independently verified. Do not substitute artificial UI animation for verified product behavior.

```sh
python3 examples/cinematic_product_demo.py --cinematic ./licensed-scene.mp4 --runtime ./captured-app.mp4 --source-sha ACTUAL_GIT_COMMIT_SHA --output ./out/product-demo.mp4
python3 -m unittest discover -s test -p 'test_demo.py' -v
npm test
```

A successful video export is not proof of model-generation, copyright/likeness permission, a live product integration, a completed purchase or FCR release authority.
