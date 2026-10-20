// Local-only soundtrack decoding/mixing for browser animatic exports.
// No microphone capture, upload, third-party playback or persistent audio storage.
export const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
export const MAX_AUDIO_SECONDS = 300;
const AUDIO_MIMES = new Set([
  'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mpeg',
  'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
  'audio/ogg', 'audio/webm'
]);
const AUDIO_EXTS = new Set(['wav', 'mp3', 'm4a', 'aac', 'ogg', 'webm']);

export function validateAudioFile(file) {
  if (!file || !Number.isFinite(file.size) || file.size < 44 || file.size > MAX_AUDIO_BYTES) {
    throw new Error('Choose a soundtrack under 12 MB.');
  }
  const mime = String(file.type || '').toLowerCase();
  const ext = String(file.name || '').split('.').pop().toLowerCase();
  if (!AUDIO_MIMES.has(mime) && !(mime === '' && AUDIO_EXTS.has(ext))) {
    throw new Error('Choose a supported WAV, MP3, M4A, AAC, OGG or WebM audio file.');
  }
  return true;
}

export async function decodeSoundtrack(file, context) {
  validateAudioFile(file);
  if (!context || typeof context.decodeAudioData !== 'function') throw new Error('This browser cannot decode a soundtrack.');
  let decoded;
  try {
    decoded = await context.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error('Audio could not be decoded on this device. Try a short WAV or MP3.');
  }
  if (!Number.isFinite(decoded.duration) || decoded.duration < 0.05 || decoded.duration > MAX_AUDIO_SECONDS) {
    throw new Error('Audio duration must be between 0.05 and 300 seconds.');
  }
  return decoded;
}

export function makeAudioTrack(context, buffer, volume) {
  if (!context || !buffer || !Number.isFinite(volume) || volume < 0 || volume > 1) {
    throw new Error('Invalid soundtrack mixing state.');
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  const gain = context.createGain();
  gain.gain.value = volume;
  const destination = context.createMediaStreamDestination();
  source.connect(gain);
  gain.connect(destination);
  if (destination.stream.getAudioTracks().length !== 1) {
    source.disconnect(); gain.disconnect();
    throw new Error('This browser cannot capture the soundtrack.');
  }
  return { source, stream: destination.stream };
}
