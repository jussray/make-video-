// Explicit, privacy-minimized export for StoryEngine's existing local JSON importer.
// Never sends anything over the network and never grants render, spend or publish authority.
export const STORYENGINE_IMPORT_SCHEMA = 'makevideo/storyboard/v1';
export const STORYENGINE_IMPORT_MAX_SHOTS = 12;
export const STORYENGINE_IMPORT_MAX_SECONDS = 60;

function clipped(value, limit) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

export function buildStoryEngineDraft(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
      raw.schema !== STORYENGINE_IMPORT_SCHEMA || !Array.isArray(raw.shots)) {
    throw new Error('Use a valid MakeVideo storyboard before exporting for Story Engine.');
  }
  if (!raw.shots.length || raw.shots.length > STORYENGINE_IMPORT_MAX_SHOTS) {
    throw new Error('Story Engine accepts 1–12 shots. Split longer storyboards first.');
  }
  const shots = raw.shots.map((shot, index) => {
    if (!shot || typeof shot !== 'object' || Array.isArray(shot)) {
      throw new Error('Shot ' + (index + 1) + ' is invalid.');
    }
    const duration = shot.duration;
    if (typeof duration !== 'number' || !Number.isFinite(duration) ||
        duration < 2 || duration > 12) {
      throw new Error('Shot ' + (index + 1) + ' needs a duration of 2–12 seconds.');
    }
    const visual = clipped(shot.visual, 500);
    const caption = clipped(shot.caption, 180);
    const title = clipped(shot.title, 100);
    if (!visual && !caption && !title) {
      throw new Error('Shot ' + (index + 1) + ' needs visual direction, caption or title.');
    }
    return {
      id: clipped(shot.id, 100) || 'shot-' + (index + 1),
      title, duration, visual, caption
    };
  });
  const total = shots.reduce((sum, shot) => sum + shot.duration, 0);
  if (total > STORYENGINE_IMPORT_MAX_SECONDS) {
    throw new Error('Story Engine accepts at most 60 seconds. Shorten or split the storyboard.');
  }
  const format = ['16:9', '9:16', '1:1'].includes(raw.format) ? raw.format : '16:9';
  // Deliberately exclude imageData, narration, continuity, private notes,
  // soundtrack references and untrusted claimed authority fields.
  return {
    schema: STORYENGINE_IMPORT_SCHEMA,
    title: clipped(raw.title, 100) || 'Untitled film',
    goal: clipped(raw.goal, 500),
    format, shots
  };
}

export function storyEngineDraftJson(raw) {
  const text = JSON.stringify(buildStoryEngineDraft(raw), null, 2);
  if (new TextEncoder().encode(text).byteLength > 150000) {
    throw new Error('Story Engine handoff JSON is larger than its 150 KB import limit.');
  }
  return text;
}
