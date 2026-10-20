import { newProject, newShot, normalizeProject, totalDuration, formatTime, shotAtTime, PALETTES } from './model.js';
import { experienceToStoryboard, EXAMPLE_EXPERIENCE } from './experience.js';
import { preferredVideoType, finalizeVideoBlob } from './recording.js';
import { photoToShotData } from './photo.js';
import { preloadProjectPhotos, drawShotPhoto, clearPhotoCache } from './photoCache.js';
import { validateAudioFile, decodeSoundtrack, makeAudioTrack } from './audio.js';

const STORE = 'juss-makevideo-storyboard-v1';
const brandedHost = location.hostname === 'makevideo.jussco.company';
document.getElementById('domain-migration').hidden = !brandedHost;
const $ = id => document.getElementById(id);
let project;
try { project = normalizeProject(JSON.parse(localStorage.getItem(STORE))); }
catch { project = newProject(); }
let selected = 0;
let playing = false;
let elapsed = 0;
let playStart = 0;
let playingFrame = 0;
let exporting = false;
let soundtrackFile = null;
let toastTimer;
const canvas = $('preview');
const ctx = canvas.getContext('2d');
function notify(message) { const t = $('toast'); t.textContent = message; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3300); }
function save() {
  project.updatedAt = new Date().toISOString();
  try { localStorage.setItem(STORE, JSON.stringify(project)); $('save-status').textContent = 'Saved locally'; }
  catch { $('save-status').textContent = 'Local save unavailable · export JSON'; }
}
function esc(text) { return String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c])); }
function dimensions(format) { return format === '9:16' ? [540, 960] : format === '1:1' ? [720, 720] : [960, 540]; }
function setSize(target, format) { const [width,height] = dimensions(format); if (target.width !== width) target.width = width; if (target.height !== height) target.height = height; }
function wrapLines(context, text, maxWidth, maxLines = 4) {
  const words = String(text).trim().split(/\s+/).filter(Boolean), lines = []; let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; }
    else line = candidate;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}
function drawFrame(target, activeProject, second) {
  const c = target.getContext('2d'), W = target.width, H = target.height;
  const { index, shot } = shotAtTime(activeProject, second);
  const [dark, light, deep] = PALETTES[shot.palette];
  const gradient = c.createLinearGradient(0, 0, W, H); gradient.addColorStop(0, dark); gradient.addColorStop(.55, light); gradient.addColorStop(1, deep);
  c.fillStyle = gradient; c.fillRect(0, 0, W, H);
  c.save(); const scale = Math.min(W, H);
  for (let n = 0; n < 5; n++) {
    const x = (W * (.15 + n * .26) + Math.sin(second * .48 + n) * scale * .05);
    const y = H * (.2 + (n % 3) * .28) + Math.cos(second * .32 + n) * scale * .06;
    const g = c.createRadialGradient(x,y,0,x,y,scale*(.28 + n*.015));
    g.addColorStop(0, 'rgba(237,208,255,.22)');g.addColorStop(1,'rgba(237,208,255,0)');
    c.fillStyle=g;c.fillRect(0,0,W,H);
  }
  c.globalAlpha=.27; c.strokeStyle='#f0d8ff'; c.lineWidth=1;
  for(let n=0;n<6;n++) { c.beginPath(); c.arc(W*.55, H*.5, scale*(.3+n*.12)+Math.sin(second*.55)*12, 0, Math.PI*2);c.stroke(); }
  c.restore();
  const shotStart=activeProject.shots.slice(0,index).reduce((sum,item)=>sum+item.duration,0);
  drawShotPhoto(c,shot.imageData,W,H,second-shotStart,shot.duration,()=>renderPreview());
  c.fillStyle='rgba(255,255,255,.86)'; c.textAlign='left'; c.font=`700 ${Math.max(12, Math.round(scale*.021))}px sans-serif`;
  c.fillText('MAKEVIDEO  /  JUSS & CO.', W*.075, H*.10);
  c.textAlign='right';c.fillText(`SHOT ${String(index+1).padStart(2,'0')}`,W*.925,H*.10);
  const title = (shot.caption || shot.title).trim();
  const size = Math.max(28, Math.floor(scale*(activeProject.format === '9:16' ? .064 : .074)));
  c.font=`800 ${size}px sans-serif`;c.textAlign='center';c.fillStyle='#fff';
  const lines=wrapLines(c,title,W*.8,4), lineHeight=size*1.28;
  let y=H*.52-(lines.length-1)*lineHeight*.5;
  for(const line of lines){c.shadowColor='#150d2880';c.shadowBlur=22;c.fillText(line,W*.5,y,W*.83);y+=lineHeight;}
  c.shadowBlur=0;c.globalAlpha=.85;c.font=`500 ${Math.max(12,Math.floor(scale*.024))}px sans-serif`;
  c.fillText(activeProject.title,W*.5,H*.9,W*.78);c.globalAlpha=1;
  return index;
}
function renderPreview(second=elapsed) {
  setSize(canvas, project.format);
  const index=drawFrame(canvas,project,second);
  $('stage-badge').textContent=`SHOT ${String(index+1).padStart(2,'0')}`;
  $('player-time').textContent=`${formatTime(second)} / ${formatTime(totalDuration(project))}`;
  $('seek').max=totalDuration(project);$('seek').value=Math.min(second,totalDuration(project));
}
function stopPlayback() { playing=false; cancelAnimationFrame(playingFrame); $('play-btn').textContent='▶';$('play-btn').setAttribute('aria-label','Play storyboard'); }
function startPlayback() {
  if (playing) {stopPlayback(); return;}
  if (elapsed >= totalDuration(project)) elapsed=0;
  playing=true;playStart=performance.now()-elapsed*1000;
  $('play-btn').textContent='Ⅱ'; $('play-btn').setAttribute('aria-label','Pause storyboard');
  function loop(t) { if (!playing) return; elapsed=Math.min(totalDuration(project),(t-playStart)/1000); renderPreview(); if(elapsed>=totalDuration(project)) {stopPlayback();return;} playingFrame=requestAnimationFrame(loop); }
  playingFrame=requestAnimationFrame(loop);
}
function renderHeader() {
  $('project-title').value=project.title; $('project-format').value=project.format;
  $('shot-count').textContent=`${project.shots.length} SHOT${project.shots.length===1?'':'S'}`;
  $('total-duration').textContent=formatTime(totalDuration(project));
  for(const field of document.querySelectorAll('[data-project-field]')) field.value=project[field.dataset.projectField];
}
function renderInspector() {
  const shot=project.shots[selected];
  $('shot-label').textContent=`${String(selected+1).padStart(2,'0')} / ${String(project.shots.length).padStart(2,'0')}`;
  for(const field of document.querySelectorAll('[data-shot-field]')) field.value=shot[field.dataset.shotField];
  $('shot-image-status').textContent=shot.imageData?'Image attached · stored in this browser':'No image added · color animation will render';
  $('remove-shot-image').disabled=!shot.imageData;
}
function renderRail() {
  const host=$('shot-list');host.replaceChildren();
  project.shots.forEach((shot,i)=>{
    const card=document.createElement('div');card.className=`shot-card ${i===selected?'selected':''}`;
    const palette=PALETTES[shot.palette];
    card.innerHTML=`<button class="shot-select" data-select="${i}" aria-label="Select shot ${i+1}" style="all:unset;cursor:pointer;display:block;width:100%"><div class="shot-thumb" style="background:linear-gradient(125deg,${palette[1]},${palette[0]})">${esc(shot.caption||shot.title)}</div><div class="shot-card-title"><strong>${esc(shot.title)}</strong><span>${shot.duration}s</span></div></button><div class="shot-ops"><button data-move="up" data-index="${i}" ${i===0?'disabled':''} aria-label="Move shot ${i+1} earlier">←</button><button data-duplicate="${i}" ${project.shots.length>=24?'disabled':''} aria-label="Duplicate shot ${i+1}">Duplicate</button><button data-move="down" data-index="${i}" ${i===project.shots.length-1?'disabled':''} aria-label="Move shot ${i+1} later">→</button><button data-delete="${i}" ${project.shots.length===1?'disabled':''} aria-label="Delete shot ${i+1}">×</button></div>`;
    if(shot.imageData){const thumb=card.querySelector('.shot-thumb');thumb.style.backgroundImage=`linear-gradient(#12092344,#12092377), url("${shot.imageData}")`;thumb.style.backgroundSize='cover';thumb.style.backgroundPosition='center';}
    host.appendChild(card);
  });
  $('add-shot').disabled=project.shots.length>=24;
}
function redraw() { renderHeader(); renderInspector(); renderRail(); elapsed=0; renderPreview(); save(); }
function fileDownload(blob, suffix) {
  const name=(project.title||'makevideo').trim().replace(/[^a-z0-9-_]+/gi,'-').slice(0,54)||'makevideo';
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${name}.${suffix}`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function updateSoundtrackUI() {
  $('soundtrack-status').textContent=soundtrackFile
    ? `Selected for this export session: ${soundtrackFile.name} (not saved in the project)`
    : 'No soundtrack selected. Video exports will be silent.';
  $('remove-soundtrack').disabled=!soundtrackFile;
  $('player-audio').textContent=soundtrackFile?'PREVIEW MUTED':'NO AUDIO';
}
async function exportAnimatic() {
  if(exporting)return;
  if(typeof MediaRecorder==='undefined'||!HTMLCanvasElement.prototype.captureStream) {
    notify('This browser cannot record video. Export the storyboard JSON instead.');
    return;
  }
  const selectedSoundtrack=soundtrackFile;
  const type=preferredVideoType(MediaRecorder,!!selectedSoundtrack);
  if(!type) {
    notify(selectedSoundtrack?'This browser cannot export video with audio. Remove the soundtrack to make a silent animatic.':'This browser supports neither WebM nor MP4 recording.');
    return;
  }
  stopPlayback();exporting=true;
  const btn=$('export-webm'), original=btn.textContent;
  btn.disabled=true;
  const snapshot=normalizeProject(project),duration=totalDuration(snapshot);
  const output=document.createElement('canvas');setSize(output,snapshot.format);
  let recorder,videoStream,mixedStream,mix,audioContext;
  try {
    // Create/resume the AudioContext inside the explicit export click gesture.
    // A soundtrack is never downgraded silently to a video-only export.
    if(selectedSoundtrack) {
      const AudioEngine=window.AudioContext||window.webkitAudioContext;
      if(!AudioEngine)throw new Error('This browser does not support local audio mixing.');
      audioContext=new AudioEngine();
      await audioContext.resume();
    }
    await preloadProjectPhotos(snapshot.shots);
    if(selectedSoundtrack) {
      const buffer=await decodeSoundtrack(selectedSoundtrack,audioContext);
      const level=Number($('soundtrack-volume').value)/100;
      mix=makeAudioTrack(audioContext,buffer,level);
    }
    videoStream=output.captureStream(24);
    mixedStream=mix ? new MediaStream([...videoStream.getVideoTracks(),...mix.stream.getAudioTracks()]) : videoStream;
    recorder=new MediaRecorder(mixedStream,{mimeType:type,videoBitsPerSecond:2500000,...(mix?{audioBitsPerSecond:128000}:{})});
    const chunks=[];
    const recording=new Promise((resolve,reject)=>{
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=()=>reject(new Error('The browser recording failed.'));
      recorder.onstop=()=>resolve(new Blob(chunks,{type:recorder.mimeType||type}));
    });
    drawFrame(output,snapshot,0);
    recorder.start(250);
    if(mix) mix.source.start(audioContext.currentTime + 0.08);
    const start=performance.now();
    await new Promise(resolve=>{
      function frame(now) {
        const second=Math.min((now-start)/1000,duration);
        drawFrame(output,snapshot,second);
        btn.textContent=`Exporting ${Math.floor(second)} / ${Math.ceil(duration)}s`;
        if(second<duration)requestAnimationFrame(frame);else resolve();
      }
      requestAnimationFrame(frame);
    });
    recorder.stop();
    const blob=await recording;
    if(blob.size<1024)throw new Error('The browser did not produce playable-looking video bytes.');
    const completed=await finalizeVideoBlob(blob,duration*1000);
    fileDownload(completed.blob,completed.extension);
    notify(`${mix?'Soundtrack included in':'Silent'} ${completed.extension.toUpperCase()} animatic exported. Review before sharing.`);
  } catch(error) {
    if(recorder?.state==='recording')recorder.stop();
    notify(`Export failed: ${error.message}`);
  } finally {
    try { mix?.source.stop(); } catch {}
    mixedStream?.getTracks().forEach(track=>track.stop());
    videoStream?.getTracks().forEach(track=>track.stop());
    mix?.stream.getTracks().forEach(track=>track.stop());
    if(audioContext)await audioContext.close().catch(()=>{});
    btn.disabled=false;btn.textContent=original;exporting=false;
  }
}
$('soundtrack-file').addEventListener('change', event=>{
  const file=event.currentTarget.files?.[0];
  event.currentTarget.value='';
  if(!file)return;
  try {
    validateAudioFile(file);
    soundtrackFile=file;
    updateSoundtrackUI();
    notify('Soundtrack ready for export. It will not be saved in the storyboard.');
  } catch(error) {notify(error.message);}
});
$('remove-soundtrack').addEventListener('click',()=>{
  soundtrackFile=null;updateSoundtrackUI();notify('Soundtrack removed from this session');
});
$('shot-image').addEventListener('change',async event=>{
  const file=event.currentTarget.files?.[0];
  event.currentTarget.value='';
  if(!file)return;
  const shotId=project.shots[selected].id;
  $('shot-image-status').textContent='Optimizing image for local storage…';
  try{
    const imageData=await photoToShotData(file,project.format);
    const nextShots=project.shots.map(shot=>shot.id===shotId?{...shot,imageData}:shot);
    const candidate=normalizeProject({...project,shots:nextShots});
    const index=candidate.shots.findIndex(shot=>shot.id===shotId);
    if(index<0)throw new Error('Selected shot no longer exists.');
    stopPlayback();
    project=candidate;selected=index;redraw();notify('Shot image attached · never uploaded');
  }catch(error){renderInspector();notify(error.message);}
});
$('remove-shot-image').addEventListener('click',()=>{
  const shot=project.shots[selected];if(!shot.imageData)return;
  shot.imageData='';stopPlayback();redraw();notify('Shot image removed');
});
$('clear-local-project').addEventListener('click',()=>{
  if(!window.confirm("Clear this browser's saved MakeVideo project, including its embedded images and notes? This cannot be undone."))return;
  stopPlayback();clearPhotoCache();localStorage.removeItem(STORE);
  soundtrackFile=null;$('soundtrack-file').value='';updateSoundtrackUI();
  project=newProject();selected=0;redraw();
  notify('Saved storyboard and embedded images cleared from this browser');
});
$('play-btn').addEventListener('click',startPlayback);
$('seek').addEventListener('input',e=>{stopPlayback();elapsed=Number(e.target.value);renderPreview();});
$('project-title').addEventListener('input',e=>{project.title=e.target.value.slice(0,100);save();renderPreview();});
$('project-format').addEventListener('change',e=>{project.format=e.target.value;stopPlayback();renderPreview();save();});
for(const field of document.querySelectorAll('[data-project-field]')) field.addEventListener('input',e=>{project[e.target.dataset.projectField]=e.target.value;save();});
for(const field of document.querySelectorAll('[data-shot-field]')) field.addEventListener('input',e=>{
  const key=e.target.dataset.shotField;
  if(key==='duration') {if(e.target.value===''||!e.target.validity.valid)return;project.shots[selected][key]=Math.max(2,Math.min(12,Math.round(Number(e.target.value))));stopPlayback();}
  else project.shots[selected][key]=e.target.value;
  renderRail();renderPreview();renderHeader();save();
});
$('shot-list').addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;
  stopPlayback();
  if('select' in button.dataset) {selected=Number(button.dataset.select);renderInspector();renderRail();elapsed=project.shots.slice(0,selected).reduce((t,s)=>t+s.duration,0);renderPreview();return;}
  if('duplicate' in button.dataset){if(project.shots.length>=24)return;const i=Number(button.dataset.duplicate),copy={...project.shots[i],id:newShot().id,title:project.shots[i].title+' copy'};project.shots.splice(i+1,0,copy);selected=i+1;}
  else if('delete' in button.dataset){if(project.shots.length<=1)return;const i=Number(button.dataset.delete);project.shots.splice(i,1);selected=Math.max(0,Math.min(selected,project.shots.length-1));}
  else if('move' in button.dataset){const i=Number(button.dataset.index),j=i+(button.dataset.move==='up'?-1:1);if(j<0||j>=project.shots.length)return;[project.shots[i],project.shots[j]]=[project.shots[j],project.shots[i]];selected=j;}
  redraw();
});
$('add-shot').addEventListener('click',()=>{if(project.shots.length>=24)return;stopPlayback();project.shots.push(newShot(project.shots.length+1));selected=project.shots.length-1;redraw();notify('Shot added');});
$('export-json').addEventListener('click',()=>{fileDownload(new Blob([JSON.stringify(normalizeProject(project),null,2)],{type:'application/json'}),'json');notify('Storyboard JSON exported');});
$('import-btn').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  if(file.size>3200000){notify('Storyboard JSON too large (3.2 MB max).');return;}
  try{const imported=normalizeProject(JSON.parse(await file.text()));stopPlayback();project=imported;selected=0;redraw();notify('Storyboard imported');}
  catch(error){notify(`Import rejected: ${error.message}`);}
});
$('export-webm').addEventListener('click',exportAnimatic);
renderHeader();renderInspector();renderRail();renderPreview();updateSoundtrackUI();
