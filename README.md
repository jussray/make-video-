# MakeVideo | Juss & Co.

Standalone web studio for drafting shot-by-shot storyboards, previewing animated text/color shots and exporting a **real, silent WebM animatic** directly in the browser. Storyboards are saved in the device's local storage and can be imported/exported as JSON.

**Boundaries:** This is a browser storyboard/animatic tool, **not** the production AI renderer. The v2.1 MAKEVIDEO production contract and StoryEngine adapter remain on the open `export/make-video-contract` branch (PR #1) until independently verified. StoryEngine/LEEVIZE own provider rendering; FCR owns publication authority. No secrets, payment processing, uploads, external API integrations or automatic publication are used by this frontend. No user data leaves the browser.

## Local verification

```sh
npm ci
npm test
npm run build
```

Cloudflare Pages: production branch `main`, root `/`, build command `npm run build`, build output `dist`. The generated `dist` is a static site and needs no server.

The animatic exports video frames with text and color and **no audio**. This does not establish real-world rendered media quality, asset rights, or permission to publish.
