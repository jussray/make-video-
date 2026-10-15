import { test, expect } from '@playwright/test';

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
