import { test, expect } from '@playwright/test';

const base='http://127.0.0.1:4173/';

test('sample walkthrough preserves existing storyboard until confirmation and works on mobile',async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base);
  await page.locator('#project-title').fill('KEEP MY ORIGINAL');
  page.once('dialog',d=>d.dismiss());
  await page.locator('#experience-sample').click();
  await expect(page.locator('#project-title')).toHaveValue('KEEP MY ORIGINAL');
  page.once('dialog',d=>d.accept());
  await page.locator('#experience-sample').click();
  await expect(page.locator('#shot-count')).toHaveText('8 SHOTS');
  await expect(page.locator('#shot-title')).toHaveValue('Founder Control Room');
  await page.locator('[data-select="7"]').click();
  await expect(page.locator('#shot-title')).toHaveValue('LUMORA');
  await expect(page.locator('#project-title')).toHaveValue('Juss & Co. Visual Engineering Walkthrough');
  const width=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(width.page).toBeLessThanOrEqual(width.viewport);
  await page.reload();
  await expect(page.locator('#shot-count')).toHaveText('8 SHOTS');
});

test('manifest JSON import builds editable animated shots, rejects spoofed states and preserves project',async ({page})=>{
  await page.goto(base);
  const sample={
    schema:'jussco/visual-experience/v1',kind:'playtest',title:'SYNC source flow',
    items:[
      {id:'lobby',title:'Lobby',summary:'Create room and join locally',state:'VERIFIED_SOURCE'},
      {id:'reveal',title:'Reveal',summary:'Observed source claims, production proof missing',state:'UNKNOWN'}
    ],
    edges:[{from:'lobby',to:'reveal',label:'Host starts when ready'}]
  };
  page.once('dialog',d=>d.accept());
  await page.locator('#experience-file').setInputFiles({name:'experience.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sample))});
  await expect(page.locator('#shot-count')).toHaveText('2 SHOTS');
  await expect(page.locator('#shot-title')).toHaveValue('Lobby');
  await expect(page.locator('#preview')).toBeVisible();
  await page.locator('[data-select="1"]').click();
  await expect(page.locator('#shot-caption')).toHaveValue(/UNKNOWN.*Reveal/);
  const malicious={...sample,items:sample.items.map(x=>({...x,state:'DEPLOYED'}))};
  await page.locator('#experience-file').setInputFiles({name:'spoofed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(malicious))});
  await expect(page.locator('#toast')).toContainText('rejected');
  await expect(page.locator('#shot-count')).toHaveText('2 SHOTS');
  await expect(page.locator('#shot-title')).toHaveValue('Reveal');
});
