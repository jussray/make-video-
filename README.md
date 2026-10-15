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

