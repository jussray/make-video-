import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
for (const entry of ['index.html', 'assets/app.js', 'assets/model.js', 'assets/recording.js', 'assets/photo.js', 'assets/photoCache.js', 'assets/audio.js', 'assets/makeimageHandoff.js', 'assets/styles.css', 'robots.txt', 'sitemap.xml', 'llms.txt', 'crawlers.json']) {
  const info = await stat(path.join(root, entry));
  if (!info.isFile() || info.size === 0) throw new Error(`Required source missing or empty: ${entry}`);
}
const dest = path.join(root, 'dist');
await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(path.join(root, 'index.html'), path.join(dest, 'index.html'));
await cp(path.join(root, 'assets'), path.join(dest, 'assets'), { recursive: true });
for (const entry of ['robots.txt','sitemap.xml','llms.txt','crawlers.json']) {
  await cp(path.join(root,entry),path.join(dest,entry));
}
console.log('MakeVideo web build ready: dist/');
