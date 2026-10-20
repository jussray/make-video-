// Portable visual-experience import: user-supplied plans, NEVER a live GitHub proof.
// Preserve MakeVideo's existing storyboard schema and editor/export pipeline.
export const EXPERIENCE_SCHEMA = 'jussco/visual-experience/v1';
const KINDS = new Set(['architecture','playtest','canon']);
const STATES = new Set(['VERIFIED_SOURCE','INFERRED','UNKNOWN','BLOCKED']);
const safeString = (value, max, label) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label} must be nonempty, max ${max} chars`);
  return value.trim();
};

export function experienceToStoryboard(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.schema !== EXPERIENCE_SCHEMA) {
    throw new Error('Unsupported visual-experience manifest');
  }
  if (!KINDS.has(raw.kind)) throw new Error('Unsupported visual-experience kind');
  const title = safeString(raw.title, 100, 'Experience title');
  if (!Array.isArray(raw.items) || raw.items.length < 1 || raw.items.length > 12) {
    throw new Error('Experience needs 1–12 items');
  }
  const ids = new Set();
  const items = raw.items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid experience item');
    if (typeof item.id !== 'string' || !/^[a-z0-9_-]{1,30}$/.test(item.id) || ids.has(item.id)) {
      throw new Error('Experience item IDs must be short and unique');
    }
    ids.add(item.id);
    if (!STATES.has(item.state)) throw new Error('Experience item must have an explicit evidence state');
    return {
      id: item.id,
      title: safeString(item.title, 90, 'Item title'),
      summary: safeString(item.summary, 240, 'Item summary'),
      state: item.state,
    };
  });
  const edges = raw.edges ?? [];
  if (!Array.isArray(edges) || edges.length > 24 || edges.some(edge => !edge || !ids.has(edge.from) || !ids.has(edge.to) || typeof (edge.label ?? '') !== 'string' || (edge.label ?? '').length > 90)) {
    throw new Error('Experience edges must reference known items');
  }
  const palette = raw.kind === 'canon' ? 'ocean' : raw.kind === 'playtest' ? 'sunset' : 'midnight';
  return {
    schema: 'makevideo/storyboard/v1',
    title,
    format: '16:9',
    goal: `${raw.kind.toUpperCase()} visualization from a user-supplied manifest. This is an illustrative animatic, NOT authenticated GitHub, game runtime, or production proof.`,
    audience: 'Founder-controlled source inspection',
    cta: 'Verify actual code, Playwright/browser or Roblox evidence before publishing',
    shots: items.map((item,index)=>({
      id: `experience-${item.id}`,
      title: item.title,
      visual: `${raw.kind.toUpperCase()} · ${item.summary}`,
      caption: `${item.state.replace(/_/g,' ')} • ${item.title}`,
      narration: `User-supplied description: ${item.summary}. Evidence state: ${item.state}. No live verification performed by MakeVideo.`,
      continuity: `Scene ${index + 1}/${items.length}. Manifest-declared relationships do not prove a runtime connection.`,
      duration: 4,
      palette,
      imageData: '',
    })),
  };
}

// Public-only example sourced from Juss & Co. repository inspection on 2026-10-20.
// This is a frozen sample, NOT live GitHub polling or a production health claim.
export const EXAMPLE_EXPERIENCE = Object.freeze({
  schema: EXPERIENCE_SCHEMA, kind: 'architecture',
  title: 'Juss & Co. Visual Engineering Walkthrough',
  items: [
    {id:'fcr', title:'Founder Control Room',summary:'Standalone operating authority and evidence plane; runtime integration remains separately proven.',state:'VERIFIED_SOURCE'},
    {id:'chief',title:'Chief AI Machine',summary:'Standalone intelligence and evidence-shaped proposal engine.',state:'VERIFIED_SOURCE'},
    {id:'sol',title:'SolContinuity',summary:'Standalone continuity and route recovery tooling.',state:'VERIFIED_SOURCE'},
    {id:'promptos',title:'PromptOS',summary:'Standalone instruction and skill governance product.',state:'VERIFIED_SOURCE'},
    {id:'sync',title:'SYNC Party',summary:'Browser game with create, join, choose, reveal and replay loop; current production play unverified here.',state:'VERIFIED_SOURCE'},
    {id:'bipseek',title:'Bip & Seek',summary:'Roblox hide-and-find implementation. Studio and mobile runtime proof not supplied here.',state:'VERIFIED_SOURCE'},
    {id:'jinx',title:'Jungle Jinx',summary:'Godot gameplay proposed in open PR #1. No verified launch on main.',state:'INFERRED'},
    {id:'lumora',title:'LUMORA',summary:'Local forest exploration and tracing browser prototype; public release unverified.',state:'VERIFIED_SOURCE'},
  ],
  edges:[
    {from:'fcr',to:'chief',label:'Contract-gated cooperation'},
    {from:'fcr',to:'sol',label:'Evidence/recovery handoff'},
    {from:'fcr',to:'promptos',label:'Instructions do not grant authority'},
  ],
});