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

export async function importMakeImageFiles(imageFile, receiptFile, format = '16:9',
                                           convertImage = photoToShotData) {
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
  const result = await verifyMakeImageReceipt(await imageFile.arrayBuffer(), receipt);
  const imageData = await convertImage(imageFile, format);
  return { ...result, imageData };
}
