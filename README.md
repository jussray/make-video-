# MakeVideo | Juss & Co.

Standalone web studio for drafting shot-by-shot storyboards, previewing animated text/color shots and exporting a **real, silent WebM or MP4 animatic** directly in the browser. Storyboards are saved in the device's local storage and can be imported/exported as JSON.

**Boundaries:** This is a browser storyboard/animatic tool, **not** the production AI renderer. The v2.1 MAKEVIDEO production contract and StoryEngine adapter remain on the open `export/make-video-contract` branch (PR #1) until independently verified. StoryEngine/LEEVIZE own provider rendering; FCR owns publication authority. No secrets, payment processing, uploads, external API integrations or automatic publication are used by this frontend. No user data leaves the browser.

## Local verification

```sh
npm ci
npm test
npm run build
```

Cloudflare Pages: production branch `main`, root `/`, build command `npm run build`, build output `dist`. The generated `dist` is a static site and needs no server.

The animatic exports video frames with text and color and **no audio**. Chrome-like WebM recordings receive explicit duration metadata where the container layout is safely supported; an unsupported layout is returned unchanged with a review warning. Browser-supported MP4 recording is enabled for compatible devices. This does not establish real-world rendered media quality, asset rights, or permission to publish.

## Local image shots

Each shot can optionally use a PNG, JPEG or WebP image supplied by the creator. The browser crops/compresses it into a bounded embedded JPEG (approximately 75 KB or less) and applies a subtle slow zoom during playback and video export. Media never uploads to an external server. The storyboard JSON contains embedded images, so treat exports as potentially private files and share only deliberately. Use only assets you have rights to. The 24-shot and per-project storage limits prevent unlimited browser storage consumption. Removing a shot image restores the abstract animated-background rendering.


## Clear saved local project
The studio stores work in this browser's local storage. The **Clear local saved project** control requires confirmation, replaces the active project with a blank storyboard, and clears the in-memory photo cache. This does not delete JSON/video files the creator explicitly downloaded or clear other sites' data. Data stored by the browser is not encrypted by this application, so use the clearing control on shared devices.

## Local audio export
Add a creator-owned or otherwise licensed WAV, MP3, M4A, AAC, OGG, or WebM soundtrack from your device (maximum 12 MiB, maximum 300 decoded seconds). Files are read in memory and never uploaded or embedded in the saved storyboard JSON. After reload, select the file again. The editor preview is intentionally muted; export includes the selected audio track and a volume slider. A shorter track stops before the video's end (no repeat); a longer track is truncated to the video length. Unsupported browsers fail visibly instead of quietly replacing a requested soundtrack with silence. The **Clear local saved project** control also removes the session-only soundtrack selection.

Actual audio codecs depend on the browser's MediaRecorder support. Always inspect and listen to the exported video. This feature does not grant permission to use third-party copyrighted music.
