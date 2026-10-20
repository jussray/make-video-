import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
for (const entry of ['index.html', 'assets/app.js', 'assets/experience.js', 'assets/model.js', 'assets/recording.js', 'assets/photo.js', 'assets/photoCache.js', 'assets/audio.js', 'assets/styles.css']) {
  const info = await stat(path.join(root, entry));
  if (!info.isFile() || info.size === 0) throw new Error(`Required source missing or empty: ${entry}`);
}
const dest = path.join(root, 'dist');
await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(path.join(root, 'index.html'), path.join(dest, 'index.html'));
await cp(path.join(root, 'assets'), path.join(dest, 'assets'), { recursive: true });
console.log('MakeVideo web build ready: dist/');
