// Local MakeImage -> MakeVideo handoff. SHA-256 binds bytes to an untrusted
// local receipt. It does not authenticate the producer, grant rights or publish.
import { photoToShotData } from './photo.js';

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const SHA_256 = /^[0-9a-f]{64}$/;
const MAX_PNG = 8 * 1024 * 1024;
const MAX_RECEIPT = 64 * 1024;

function requireObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export async function verifyMakeImageReceipt(pngBytes, receipt) {
  if (!(pngBytes instanceof ArrayBuffer) || pngBytes.byteLength < 24 ||
      pngBytes.byteLength > MAX_PNG) {
    throw new Error('MakeImage PNG must be 1–8 MB or smaller and readable.');
  }
  const bytes = new Uint8Array(pngBytes);
  if (!PNG_SIGNATURE.every((value, index) => bytes[index] === value) ||
      String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR') {
    throw new Error('Selected image is not a valid PNG header.');
  }
  const header = new DataView(pngBytes);
  const width = header.getUint32(16);
  const height = header.getUint32(20);
  if (!width || !height || width > 8192 || height > 8192 || width * height > 20_000_000) {
    throw new Error('MakeImage PNG dimensions are outside safe limits.');
  }
  if (!requireObject(receipt) ||
      receipt.schema !== 'makeimage/local-composite/v1' ||
      receipt.state !== 'VERIFIED_LOCAL_RENDER' ||
      !requireObject(receipt.output) ||
      receipt.output.format !== 'PNG' ||
      !SHA_256.test(receipt.output.sha256) ||
      !SHA_256.test(receipt.continuity_fingerprint) ||
      !requireObject(receipt.continuity_cookie) ||
      receipt.continuity_cookie.publish_authority !== false) {
    throw new Error('MakeImage receipt does not match the supported local-composite proof format.');
  }
  if (receipt.output.bytes !== undefined && receipt.output.bytes !== pngBytes.byteLength) {
    throw new Error('PNG byte count differs from the receipt.');
  }
  if (receipt.output.pixel_sha256 !== undefined && (!SHA_256.test(receipt.output.pixel_sha256) || receipt.output.full_decode !== true)) {
    throw new Error('Unsupported decoded pixel proof.');
  }
  if (width !== receipt.output.width || height !== receipt.output.height) {
    throw new Error('PNG dimensions differ from the MakeImage receipt.');
  }
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure browser crypto is required to verify the PNG digest.');
  }
  const hash = await globalThis.crypto.subtle.digest('SHA-256', pngBytes);
  const digest = [...new Uint8Array(hash)]
    .map(value => value.toString(16).padStart(2, '0')).join('');
  if (digest !== receipt.output.sha256) {
    throw new Error('PNG bytes do not match the MakeImage receipt SHA-256.');
  }
  return {
    digest,
    continuity: 'Source: MakeImage local PNG composite; original SHA-256 ' + digest +
      '; continuity ' + receipt.continuity_fingerprint +
      '. File bytes matched receipt; producer authenticity, AI inference, rights, and publication are not verified.'
  };
}

async function decodeRgbDigest(bytes, width, height) {
  const bitmap = await createImageBitmap(new Blob([bytes], {type:'image/png'}), {colorSpaceConversion:'none',premultiplyAlpha:'none'});
  try {
    if (bitmap.width !== width || bitmap.height !== height) throw new Error('Decoded pixels have incorrect dimensions.');
    const canvas = document.createElement('canvas');
    canvas.width=width; canvas.height=height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx) throw new Error('Decoded pixels unavailable.');
    ctx.drawImage(bitmap,0,0);
    const rgba=ctx.getImageData(0,0,width,height).data;
    const rgb=new Uint8Array(width*height*3);
    for(let i=0,j=0;i<rgba.length;i+=4,j+=3){
      if(rgba[i+3]!==255) throw new Error('Decoded pixels must be opaque.');
      rgb.set(rgba.subarray(i,i+3),j);
    }
    const digest=await crypto.subtle.digest('SHA-256',rgb);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  } finally { bitmap.close(); }
}

export async function importMakeImageFiles(imageFile, receiptFile, format = '16:9',
                                           convertImage = photoToShotData, inspectPixels = decodeRgbDigest) {
  if (!imageFile || imageFile.type !== 'image/png' || !imageFile.size ||
      imageFile.size > MAX_PNG) {
    throw new Error('Select a local PNG image up to 8 MB.');
  }
  if (!receiptFile || !receiptFile.size || receiptFile.size > MAX_RECEIPT) {
    throw new Error('Select a matching JSON receipt up to 64 KB.');
  }
  let receipt;
  try {
    receipt = JSON.parse(await receiptFile.text());
  } catch {
    throw new Error('MakeImage receipt is not valid JSON.');
  }
  const bytes = await imageFile.arrayBuffer();
  const result = await verifyMakeImageReceipt(bytes, receipt);
  let pixel_digest_matched = false;
  if(receipt.output.pixel_sha256 !== undefined){
    const actual=await inspectPixels(bytes,receipt.output.width,receipt.output.height);
    if(actual!==receipt.output.pixel_sha256) throw new Error('Decoded pixels do not match the MakeImage receipt.');
    pixel_digest_matched=true;
  }
  // Convert the identical verified bytes, not a second read of the original input.
  const imageData = await convertImage(new Blob([bytes],{type:'image/png'}), format);
  return { ...result, pixel_digest_matched, imageData };
}
