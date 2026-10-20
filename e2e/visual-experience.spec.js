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

test('source-labeled experience produces a real locally recorded playable WebM artifact', async ({page}) => {
  test.setTimeout(45000);
  await page.addInitScript(() => {
    const original=URL.createObjectURL.bind(URL);
    URL.createObjectURL=blob=>{
      if(blob?.type?.startsWith('video/')) window.__visualExperienceVideo=blob;
      return original(blob);
    };
  });
  await page.goto(base);
  const source={
    schema:'jussco/visual-experience/v1', kind:'playtest', title:'Source-Labeled SYNC Walkthrough',
    items:[
      {id:'lobby',title:'Create and join',summary:'Source-described lobby flow; browser production status unverified.',state:'VERIFIED_SOURCE'},
      {id:'reveal',title:'Reveal and score',summary:'Source-described scoring step; real room proof required.',state:'UNKNOWN'}
    ]
  };
  page.once('dialog',d=>d.accept());
  await page.locator('#experience-file').setInputFiles({name:'visual-experience.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
  await expect(page.locator('#shot-count')).toHaveText('2 SHOTS');
  await page.locator('#shot-duration').fill('2');
  await page.locator('[data-select="1"]').click();
  await page.locator('#shot-duration').fill('2');
  await page.locator('#export-webm').click();
  await expect.poll(()=>page.evaluate(()=>window.__visualExperienceVideo?.size??0),{timeout:20000}).toBeGreaterThan(1024);
  const bytes=await page.evaluate(async()=>{
    const blob=window.__visualExperienceVideo;
    const raw=new Uint8Array(await blob.arrayBuffer());
    let binary='';
    for(let i=0;i<raw.length;i+=8192)binary+=String.fromCharCode(...raw.subarray(i,i+8192));
    return btoa(binary);
  });
  const {mkdirSync,writeFileSync} = await import('node:fs');
  const {execFileSync} = await import('node:child_process');
  mkdirSync('test-results',{recursive:true});
  const filename='test-results/visual-experience.webm';
  writeFileSync(filename,Buffer.from(bytes,'base64'));
  const metadata=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,codec_name','-of','json',filename]).toString());
  expect(metadata.streams.some(stream=>stream.codec_type==='video')).toBe(true);
  expect(Number(metadata.format.duration)).toBeGreaterThan(3.7);
  expect(Number(metadata.format.duration)).toBeLessThan(4.5);
});
