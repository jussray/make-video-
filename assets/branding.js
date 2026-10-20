// First-party offline brand overlay shared by preview, PNG frame and recorded video.
// The QR asset is the verified direct-link SVG from the Juss & Co site.
export const BRAND_URL = 'https://www.jussco.company/';
let qrImage = null;
let loading = null;

export function ensureBrandQr() {
  if (qrImage) return Promise.resolve(qrImage);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { qrImage = img; resolve(img); };
      img.onerror = () => { loading = null; reject(new Error('First-party QR asset unavailable; branded export blocked.')); };
      img.src = new URL('./qr/jussco-company.svg', import.meta.url).href;
    });
  }
  return loading;
}

export function drawBrandOverlay(ctx, width, height, branding = {}) {
  if (!branding.watermark && !branding.qr) return;
  const scale = Math.min(width, height);
  const margin = Math.round(scale * .035);
  ctx.save();
  if (branding.watermark) {
    const fontSize = Math.max(13, Math.round(scale * .028));
    ctx.font = `800 ${fontSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const label = 'JUSS & CO.';
    const labelWidth = ctx.measureText(label).width;
    const x = Math.round(width * .06), y = height - margin;
    ctx.fillStyle = 'rgba(13,8,33,.82)';
    ctx.fillRect(x - 9, y - fontSize - 9, labelWidth + 18, fontSize + 16);
    ctx.fillStyle = '#f9eeff';
    ctx.fillText(label, x, y);
  }
  if (branding.qr && qrImage) {
    // Native image preserves the SVG's white quiet zone. Never scale below
    // ~3 output pixels per QR module for a scan-friendly 41-cell asset.
    const side = Math.round(Math.min(Math.max(148, scale * .3), width * .35, height * .37));
    ctx.drawImage(qrImage, width - side - margin, height - side - margin, side, side);
  }
  ctx.restore();
}
