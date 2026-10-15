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
