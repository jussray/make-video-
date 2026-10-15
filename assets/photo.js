// Local-only image ingestion. Encode shots as small bounded JPEGs so saved JSON
// remains portable and the browser's local storage is not silently exhausted.
export const MAX_SHOT_IMAGE_CHARS = 105_000;
export const MAX_PROJECT_IMAGE_CHARS = 2_400_000;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg','image/png','image/webp']);

export async function photoToShotData(file, format = '16:9') {
  if (!file || !ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error('Select a PNG, JPEG or WebP image.');
  if (!file.size || file.size > 8 * 1024 * 1024) throw new Error('Image must be at most 8 MB.');
  const url = URL.createObjectURL(file);
  const img = new Image();
  try {
    await new Promise((resolve,reject)=>{
      img.onload=resolve;
      img.onerror=()=>reject(new Error('Image could not be decoded.'));
      img.src=url;
    });
    const w=img.naturalWidth, h=img.naturalHeight;
    if(!w||!h||w>8192||h>8192||w*h>20_000_000) throw new Error('Image dimensions are too large.');
    const [outW,outH] = format==='9:16' ? [540,960] : format==='1:1' ? [720,720] : [960,540];
    const stage=document.createElement('canvas');
    stage.width=outW;stage.height=outH;
    const ctx=stage.getContext('2d');
    if(!ctx) throw new Error('Image canvas is unavailable.');
    ctx.fillStyle='#17102d';ctx.fillRect(0,0,outW,outH);
    const scale=Math.max(outW/w,outH/h);
    const cropW=outW/scale,cropH=outH/scale;
    ctx.drawImage(img,(w-cropW)/2,(h-cropH)/2,cropW,cropH,0,0,outW,outH);
    for(const quality of [.75,.62,.5,.4,.3,.2]) {
      const data=stage.toDataURL('image/jpeg',quality);
      if(data.startsWith('data:image/jpeg;base64,')&&data.length<=MAX_SHOT_IMAGE_CHARS) return data;
    }
    throw new Error('Image is too detailed for safe local project storage. Choose a simpler or smaller image.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
