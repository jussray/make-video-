export const SCHEMA = 'makevideo/storyboard/v1';
export const PALETTES = {
  midnight: ['#100a35', '#6f45da', '#140729'],
  sunset: ['#321038', '#d26f95', '#2d164b'],
  ocean: ['#061f38', '#1d8ca9', '#1e174d'],
  ember: ['#301129', '#dc7a46', '#31154e'],
};
const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clean = (value, max = 500) => String(value ?? '').slice(0, max);
export function newShot(index = 1) {
  return {
    id: id(), title: `Shot ${index}`, duration: 4,
    visual: '', caption: '', narration: '', continuity: '', palette: 'midnight',
  };
}
export function newProject() {
  return {
    schema: SCHEMA, title: 'Untitled film', format: '16:9',
    goal: '', audience: '', cta: '',
    shots: [newShot(1)], updatedAt: new Date().toISOString(),
  };
}
export function normalizeProject(raw) {
  if (!raw || raw.schema !== SCHEMA || !Array.isArray(raw.shots) || raw.shots.length < 1 || raw.shots.length > 24) {
    throw new Error('Unsupported MakeVideo storyboard format or shot count (1–24).');
  }
  const shots = raw.shots.map((s, i) => {
    if (!s || typeof s !== 'object') throw new Error('A shot has invalid data.');
    return {
      id: clean(s.id, 100) || id(), title: clean(s.title || `Shot ${i+1}`, 100),
      duration: Math.max(2, Math.min(12, Number.isFinite(Number(s.duration)) ? Number(s.duration) : 4)),
      visual: clean(s.visual, 2000), caption: clean(s.caption, 180),
      narration: clean(s.narration, 1000), continuity: clean(s.continuity, 1000),
      palette: Object.hasOwn(PALETTES, s.palette) ? s.palette : 'midnight',
    };
  });
  if (new Set(shots.map(s => s.id)).size !== shots.length) throw new Error('Shot IDs must be unique.');
  return {
    schema: SCHEMA, title: clean(raw.title || 'Untitled film', 100),
    format: ['16:9', '9:16', '1:1'].includes(raw.format) ? raw.format : '16:9',
    goal: clean(raw.goal, 500), audience: clean(raw.audience, 250),
    cta: clean(raw.cta, 250), shots,
    updatedAt: new Date().toISOString(),
  };
}
export function totalDuration(project) { return project.shots.reduce((sum, s) => sum + s.duration, 0); }
export function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}
export function shotAtTime(project, elapsed) {
  let offset = 0;
  for (let i = 0; i < project.shots.length; i++) {
    offset += project.shots[i].duration;
    if (elapsed < offset) return { index: i, shot: project.shots[i] };
  }
  return { index: project.shots.length - 1, shot: project.shots.at(-1) };
}
