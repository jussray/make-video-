// Browser MediaRecorder container selection and safe WebM duration metadata repair.
// The WebM patch is intentionally limited to recordings with an unknown-sized
// Segment and no SeekHead/Cues to avoid invalidating absolute media offsets.
export function preferredVideoType(recorderClass, withAudio = false) {
  if (!recorderClass || typeof recorderClass.isTypeSupported !== 'function') return null;
  const formats = withAudio
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4']
    : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4;codecs=avc1.42E01E', 'video/mp4'];
  return formats.find(type => recorderClass.isTypeSupported(type)) || null;
}

export function extensionForVideoType(type) {
  const normalized = String(type || '').toLowerCase();
  if (normalized.startsWith('video/mp4')) return 'mp4';
  if (normalized.startsWith('video/webm')) return 'webm';
  throw new Error('Unsupported recording container.');
}

function readId(bytes, offset) {
  if (offset >= bytes.length) throw new Error('Truncated EBML element.');
  const first = bytes[offset];
  let width = 1;
  for (; width <= 4; width++) if (first & (0x80 >>> (width - 1))) break;
  if (width > 4 || offset + width > bytes.length) throw new Error('Invalid EBML element ID.');
  let value = 0;
  for (let i = 0; i < width; i++) value = value * 256 + bytes[offset + i];
  return { value, width };
}

function readSize(bytes, offset) {
  if (offset >= bytes.length) throw new Error('Truncated EBML size.');
  const first = bytes[offset];
  let width = 1;
  for (; width <= 8; width++) if (first & (0x80 >>> (width - 1))) break;
  if (width > 8 || offset + width > bytes.length) throw new Error('Invalid EBML size.');
  let value = BigInt(first & (0xff >>> width));
  for (let i = 1; i < width; i++) value = value * 256n + BigInt(bytes[offset + i]);
  const unknown = value === (1n << BigInt(width * 7)) - 1n;
  if (value > BigInt(Number.MAX_SAFE_INTEGER) && !unknown) throw new Error('Oversized EBML element.');
  return { value: unknown ? null : Number(value), width };
}

function element(bytes, offset, limit) {
  const id = readId(bytes, offset);
  const sizeOffset = offset + id.width;
  const size = readSize(bytes, sizeOffset);
  const start = sizeOffset + size.width;
  const end = size.value === null ? limit : start + size.value;
  if (start > limit || end > limit) throw new Error('EBML element extends past recording.');
  return { id: id.value, sizeOffset, sizeWidth: size.width, size: size.value, start, end };
}

function children(bytes, start, end) {
  const out = [];
  for (let pos = start; pos < end;) {
    const e = element(bytes, pos, end);
    out.push(e);
    if (e.size === null || e.end <= pos) break;
    pos = e.end;
  }
  return out;
}

function encodeSize(value, width) {
  const max = (1n << BigInt(7 * width)) - 2n;
  if (!Number.isSafeInteger(value) || value < 0 || BigInt(value) > max) throw new Error('Duration metadata does not fit EBML size field.');
  const out = new Uint8Array(width);
  let remaining = BigInt(value);
  for (let i = width - 1; i >= 0; i--) { out[i] = Number(remaining & 255n); remaining >>= 8n; }
  out[0] |= 1 << (8 - width);
  return out;
}

function numericValue(bytes, start, end) {
  if (end - start < 1 || end - start > 8) throw new Error('Unsupported WebM timescale width.');
  let value = 0;
  for (let i = start; i < end; i++) value = value * 256 + bytes[i];
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid WebM timescale.');
  return value;
}

function durationBytes(duration, size = 8) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Invalid duration.');
  const arr = new Uint8Array(size), view = new DataView(arr.buffer);
  if (size === 8) view.setFloat64(0, duration, false);
  else if (size === 4) view.setFloat32(0, duration, false);
  else throw new Error('Unsupported Duration element precision.');
  return arr;
}

function hasId(bytes, id) {
  for (let i = 0; i <= bytes.length - id.length; i++) {
    let matched = true;
    for (let j = 0; j < id.length; j++) if (bytes[i + j] !== id[j]) { matched = false; break; }
    if (matched) return true;
  }
  return false;
}

export function addWebmDuration(bytesInput, durationMs) {
  const bytes = bytesInput instanceof Uint8Array ? bytesInput : new Uint8Array(bytesInput);
  if (!Number.isFinite(durationMs) || durationMs <= 0) throw new Error('A positive measured recording duration is required.');
  const header = element(bytes, 0, bytes.length);
  if (header.id !== 0x1a45dfa3 || header.size === null) throw new Error('Not a supported WebM recording.');
  const segment = element(bytes, header.end, bytes.length);
  if (segment.id !== 0x18538067 || segment.size !== null) throw new Error('Unsupported WebM Segment; refusing to rewrite offsets.');
  // Conservative protection against breaking authored media with absolute cue/seek offsets.
  if (hasId(bytes, [0x11, 0x4d, 0x9b, 0x74]) || hasId(bytes, [0x1c, 0x53, 0xbb, 0x6b])) {
    throw new Error('Indexed WebM requires a dedicated remuxer.');
  }
  const top = children(bytes, segment.start, Math.min(bytes.length, segment.start + 64 * 1024));
  const info = top.find(item => item.id === 0x1549a966);
  if (!info || info.size === null) throw new Error('WebM Info block was not found.');
  const fields = children(bytes, info.start, info.end);
  const scale = fields.find(f => f.id === 0x2ad7b1);
  const timecodeScale = scale ? numericValue(bytes, scale.start, scale.end) : 1_000_000;
  const timecodeDuration = durationMs * 1_000_000 / timecodeScale;
  const previous = fields.find(f => f.id === 0x4489);
  if (previous) {
    const replacement = durationBytes(timecodeDuration, previous.size);
    const output = bytes.slice();output.set(replacement, previous.start);
    return output;
  }
  const payload = new Uint8Array(11);
  payload.set([0x44, 0x89, 0x88]);
  payload.set(durationBytes(timecodeDuration), 3);
  const size = encodeSize(info.size + payload.length, info.sizeWidth);
  const output = new Uint8Array(bytes.length + payload.length);
  output.set(bytes.subarray(0, info.sizeOffset), 0);
  output.set(size, info.sizeOffset);
  output.set(bytes.subarray(info.sizeOffset + info.sizeWidth, info.end), info.sizeOffset + info.sizeWidth);
  output.set(payload, info.end);
  output.set(bytes.subarray(info.end), info.end + payload.length);
  return output;
}

export async function finalizeVideoBlob(blob, durationMs) {
  const ext = extensionForVideoType(blob.type);
  if (ext === 'mp4') return { blob, extension: 'mp4', durationPatched: false };
  try {
    const fixed = addWebmDuration(new Uint8Array(await blob.arrayBuffer()), durationMs);
    return { blob: new Blob([fixed], { type: 'video/webm' }), extension: 'webm', durationPatched: true };
  } catch {
    // Never corrupt or discard a recorded file if a browser emits a different EBML layout.
    return { blob, extension: 'webm', durationPatched: false };
  }
}
