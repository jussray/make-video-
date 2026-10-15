// A browser-only image cache. Sources are bounded embedded JPEGs, never network URLs.
const photos = new Map();
function getPhoto(data, ready) {
  if (!data) return null;
  if (!photos.has(data)) {
    const image = new Image();
    const promise = new Promise((resolve,reject)=>{
      image.onload=()=>resolve(image);
      image.onerror=()=>reject(new Error('A stored shot image could not be decoded.'));
    });
    photos.set(data,{ image,promise });
    image.src=data;
    if (ready) promise.then(ready).catch(()=>{});
  }
  return photos.get(data);
}

export async function preloadProjectPhotos(shots) {
  await Promise.all([...new Set(shots.map(s=>s.imageData).filter(Boolean))]
    .map(data => getPhoto(data).promise));
}

export function drawShotPhoto(ctx, data, W, H, elapsed, shotDuration, onReady) {
  const photo=getPhoto(data,onReady);
  if (!photo || !photo.image.complete || !photo.image.naturalWidth) return false;
  const image=photo.image, progress=Math.max(0,Math.min(1,elapsed / (shotDuration||1)));
  const zoom=1.04+progress*.07;
  const scale=Math.max(W/image.naturalWidth,H/image.naturalHeight)*zoom;
  const srcW=W/scale,srcH=H/scale;
  const slackX=image.naturalWidth-srcW,slackY=image.naturalHeight-srcH;
  const srcX=slackX*(.46+progress*.07), srcY=slackY*(.51-progress*.04);
  ctx.drawImage(image,srcX,srcY,srcW,srcH,0,0,W,H);
  ctx.fillStyle='rgba(10,6,26,.32)';
  ctx.fillRect(0,0,W,H);
  return true;
}

export function clearPhotoCache() { photos.clear(); }
