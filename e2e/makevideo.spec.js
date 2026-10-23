import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = 'http://127.0.0.1:4173/';

test('mobile storyboard edits and restores shots without overflowing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await expect(page.locator('#shot-count')).toHaveText('1 SHOT');
  await page.locator('#add-shot').click();
  await expect(page.locator('#shot-count')).toHaveText('2 SHOTS');
  await page.locator('#shot-title').fill('Playwright shot');
  await expect(page.locator('.shot-card')).toHaveCount(2);
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.viewport);
  await page.reload();
  await expect(page.locator('#shot-count')).toHaveText('2 SHOTS');
  await page.locator('[data-select="1"]').click();
  await expect(page.locator('#shot-title')).toHaveValue('Playwright shot');
});

test('actual exported WebM has a finite duration and can seek', async ({ page }) => {
  test.setTimeout(40000);
  await page.addInitScript(() => {
    const original = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      if (blob?.type?.startsWith('video/')) window.__makevideoCaptured = blob;
      return original(blob);
    };
  });
  await page.goto(base);
  await page.locator('#shot-duration').fill('2');
  await page.locator('#export-webm').click();
  await expect.poll(() => page.evaluate(() => window.__makevideoCaptured?.size ?? 0), { timeout: 20000 }).toBeGreaterThan(1024);
  const metadata = await page.evaluate(async () => {
    const blob = window.__makevideoCaptured;
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    document.body.appendChild(video);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Video metadata or seeking timed out')), 8000);
      video.onerror = () => { clearTimeout(timeout); reject(new Error('Video decoding failed')); };
      video.onloadedmetadata = () => {
        if (!Number.isFinite(video.duration)) {
          clearTimeout(timeout);
          reject(new Error('Export lacks finite duration metadata'));
          return;
        }
        video.onseeked = () => {
          clearTimeout(timeout);
          resolve({ type: blob.type, duration: video.duration, width: video.videoWidth, height: video.videoHeight, position: video.currentTime, error: video.error?.code ?? 0 });
          video.remove(); URL.revokeObjectURL(url);
        };
        video.currentTime = 1;
      };
    });
  });
  expect(metadata.type).toContain('video/webm');
  expect(metadata.duration).toBeGreaterThanOrEqual(1.9);
  expect(metadata.duration).toBeLessThanOrEqual(2.1);
  expect(metadata.position).toBeGreaterThan(0.8);
  expect(metadata.width).toBe(960);
  expect(metadata.height).toBe(540);
  expect(metadata.error).toBe(0);
});

test('creator-owned local photo persists and becomes visible in shot preview and exported WebM', async ({ page }) => {
  test.setTimeout(45000);
  await page.addInitScript(() => {
    const original = URL.createObjectURL.bind(URL);
    URL.createObjectURL = blob => {
      if (blob?.type?.startsWith('video/')) window.__mediaExport = blob;
      return original(blob);
    };
  });
  await page.goto(base);
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width=600;canvas.height=400;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#ff2222';
    ctx.fillRect(0,0,600,400);
    const blob=await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
    const file=new File([blob],'red-scene.png',{type:'image/png'});
    const transfer=new DataTransfer();transfer.items.add(file);
    const input=document.getElementById('shot-image');
    input.files=transfer.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await expect(page.locator('#shot-image-status')).toContainText('Image attached');
  await expect.poll(() => page.evaluate(()=>{
    const c=document.getElementById('preview'),v=c.getContext('2d').getImageData(20,220,1,1).data;
    return v[0] > v[1]*1.8 && v[0] > v[2]*1.5;
  }),{timeout:7000}).toBe(true);
  await page.reload();
  await expect(page.locator('#shot-image-status')).toContainText('Image attached');
  await expect.poll(()=>page.evaluate(()=>{
    const shot=JSON.parse(localStorage.getItem('juss-makevideo-storyboard-v1')).shots[0];
    return shot.imageData.startsWith('data:image/jpeg;base64,') && shot.imageData.length <= 105000;
  })).toBe(true);
  await page.locator('#shot-duration').fill('2');
  await page.locator('#export-webm').click();
  await expect.poll(()=>page.evaluate(()=>window.__mediaExport?.size||0),{timeout:15000}).toBeGreaterThan(1024);
  const bytes=await page.evaluate(async()=>new Uint8Array((await window.__mediaExport.arrayBuffer()).slice(0,4)).join(','));
  expect(bytes).toBe('26,69,223,163');
  await page.locator('#remove-shot-image').click();
  await expect(page.locator('#shot-image-status')).toContainText('No image added');
  await page.reload();
  await expect(page.locator('#shot-image-status')).toContainText('No image added');
});

test('clear saved storyboard requires confirmation and removes private project data', async ({ page }) => {
  await page.goto(base);
  await page.locator('#project-title').fill('PRIVATE TEST PROJECT');
  await page.locator('#shot-visual').fill('Confidential shot note for erase test');
  await page.locator('details.brief summary').click();
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#clear-local-project').click();
  await expect(page.locator('#project-title')).toHaveValue('PRIVATE TEST PROJECT');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#clear-local-project').click();
  await expect(page.locator('#project-title')).toHaveValue('Untitled film');
  await expect(page.locator('#shot-count')).toHaveText('1 SHOT');
  expect(await page.evaluate(() => localStorage.getItem('juss-makevideo-storyboard-v1'))).not.toContain('PRIVATE TEST PROJECT');
  expect(await page.evaluate(() => localStorage.getItem('juss-makevideo-storyboard-v1'))).not.toContain('Confidential shot note');
  await page.reload();
  await expect(page.locator('#project-title')).toHaveValue('Untitled film');
});

function originalToneWav(seconds=2) {
  const sampleRate=48000, samples=sampleRate*seconds;
  const pcmBytes=samples*2, wav=Buffer.alloc(44+pcmBytes);
  wav.write('RIFF',0);wav.writeUInt32LE(36+pcmBytes,4);wav.write('WAVE',8);
  wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);
  wav.writeUInt16LE(1,22);wav.writeUInt32LE(sampleRate,24);
  wav.writeUInt32LE(sampleRate*2,28);wav.writeUInt16LE(2,32);
  wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcmBytes,40);
  for(let i=0;i<samples;i++) {
    const value=Math.round(13000*Math.sin(2*Math.PI*440*i/sampleRate));
    wav.writeInt16LE(value,44+i*2);
  }
  return wav;
}

test('local original soundtrack is really muxed and audible in exported WebM', async ({ page }) => {
  test.setTimeout(50000);
  await page.addInitScript(()=>{
    const original=URL.createObjectURL.bind(URL);
    URL.createObjectURL=(blob)=>{
      if(blob?.type?.startsWith('video/'))window.__exportedAudioVideo=blob;
      return original(blob);
    };
  });
  await page.goto(base);
  await page.locator('#soundtrack-file').setInputFiles({
    name:'original-440hz.wav',mimeType:'audio/wav',buffer:originalToneWav()
  });
  await expect(page.locator('#soundtrack-status')).toContainText('Selected for this export session');
  await page.locator('#soundtrack-volume').fill('100');
  await page.locator('#shot-duration').fill('2');
  await page.locator('#export-webm').click();
  await expect.poll(()=>page.evaluate(()=>window.__exportedAudioVideo?.size??0),{timeout:20000}).toBeGreaterThan(1024);
  const bytes=await page.evaluate(async()=>{
    const data=new Uint8Array(await window.__exportedAudioVideo.arrayBuffer());
    let binary='';
    for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192));
    return btoa(binary);
  });
  mkdirSync('test-results',{recursive:true});
  const filename='test-results/local-soundtrack.webm';
  writeFileSync(filename,Buffer.from(bytes,'base64'));
  const raw=execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type,codec_name','-of','json',filename]);
  const info=JSON.parse(raw.toString('utf8'));
  expect(info.streams.some(s=>s.codec_type==='video')).toBe(true);
  expect(info.streams.some(s=>s.codec_type==='audio' && s.codec_name==='opus')).toBe(true);
  const pcm=execFileSync('ffmpeg',['-v','error','-i',filename,'-vn','-f','s16le','-ac','1','-ar','16000','pipe:1']);
  let peak=0;
  for(let i=0;i+1<pcm.length;i+=2)peak=Math.max(peak,Math.abs(pcm.readInt16LE(i)));
  expect(pcm.length).toBeGreaterThan(1000);
  expect(peak).toBeGreaterThan(500);
  await page.locator('#remove-soundtrack').click();
  await expect(page.locator('#soundtrack-status')).toContainText('No soundtrack selected');
  await page.reload();
  await expect(page.locator('#soundtrack-status')).toContainText('No soundtrack selected');
});

test('selected soundtrack is cleared with the private project', async ({page}) => {
  await page.goto(base);
  await page.locator('#soundtrack-file').setInputFiles({
    name:'original-440hz.wav',mimeType:'audio/wav',buffer:originalToneWav(1)
  });
  await expect(page.locator('#soundtrack-status')).toContainText('Selected for this export session');
  await page.locator('details.brief summary').click();
  page.once('dialog',d=>d.accept());
  await page.locator('#clear-local-project').click();
  await expect(page.locator('#soundtrack-status')).toContainText('No soundtrack selected');
});

test('canonical domain declares portable local JSON migration without cross-origin data access', async ({ page }) => {
  await page.goto(base);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://makevideo.jussco.company/');
  await expect(page.locator('#domain-migration')).toBeHidden();
  await page.evaluate(() => {
    // The canonical presentation is host-scoped, not an attempt to read another origin.
    document.getElementById('domain-migration').hidden=false;
  });
  await expect(page.locator('#domain-migration a')).toHaveAttribute('href','https://make-video.mcgill-raylene.workers.dev/');
  await expect(page.locator('#domain-migration')).toContainText('Storyboard JSON');
  await expect(page.locator('#domain-migration')).toContainText('private notes');
});

test('local MakeImage receipt handoff validates PNG before changing a shot', async ({ page }) => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGMMN1jFwMDAxMDAwMDAAAAOIwE1OiEMugAAAABJRU5ErkJggg==', 'base64');
  const sha = createHash('sha256').update(png).digest('hex');
  const receipt = {
    schema: 'makeimage/local-composite/v1',
    state: 'VERIFIED_LOCAL_RENDER',
    continuity_fingerprint: 'b'.repeat(64),
    continuity_cookie: { publish_authority: false },
    output: {format: 'PNG',sha256: sha,width: 2,height: 2}
  };
  await page.goto(base);
  await page.locator('#makeimage-png').setInputFiles({name: 'scene.png',mimeType:'image/png',buffer:png});
  await page.locator('#makeimage-receipt').setInputFiles({
    name: 'scene.receipt.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(receipt))
  });
  await page.locator('#makeimage-attach').click();
  await expect(page.locator('#makeimage-status')).toContainText('PNG digest matched');
  await expect(page.locator('#shot-continuity')).toHaveValue(new RegExp(sha));
  await expect(page.locator('#shot-image-status')).toContainText('Image attached');
  await page.reload();
  await expect(page.locator('#shot-continuity')).toHaveValue(new RegExp(sha));
  // Deliberately change one source byte. The project must survive untouched.
  const tampered = Buffer.from(png);
  tampered[tampered.length - 1] ^= 1;
  await page.locator('#makeimage-png').setInputFiles({name: 'tampered.png',mimeType:'image/png',buffer:tampered});
  await page.locator('#makeimage-receipt').setInputFiles({
    name:'scene.receipt.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(receipt))
  });
  await page.locator('#makeimage-attach').click();
  await expect(page.locator('#makeimage-status')).toContainText('Import blocked');
  await expect(page.locator('#shot-continuity')).toHaveValue(new RegExp(sha));
  await expect(page.locator('#shot-image-status')).toContainText('Image attached');
});
