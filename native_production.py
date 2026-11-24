#!/usr/bin/env python3
"""Offline production of rights-confirmed footage, narration, captions and evidence."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from demo import render, validate_clip, sha256, RenderError

class ProductionError(ValueError):
    pass

def asset(root, value, extensions):
    if not isinstance(value,str) or not value or len(value)>512:
        raise ProductionError("Invalid local asset path")
    p=Path(value)
    if p.is_absolute() or ".." in p.parts or ":" in value or "\\" in value:
        raise ProductionError("Assets must be relative local files inside the manifest directory")
    try:
        target=(root/p).resolve(strict=True)
    except OSError as exc:
        raise ProductionError("Missing local asset: "+value) from exc
    if not target.is_relative_to(root) or not target.is_file() or target.suffix.lower() not in extensions:
        raise ProductionError("Unsupported asset or outside project directory: "+value)
    return target

def load_plan(path):
    path=Path(path).resolve(strict=True)
    if path.stat().st_size>65536:
        raise ProductionError("Manifest exceeds 64 KiB")
    try:
        data=json.loads(path.read_text(encoding="utf-8"))
    except (ValueError,UnicodeError) as exc:
        raise ProductionError("Invalid JSON manifest") from exc
    if not isinstance(data,dict) or data.get("schema")!="makevideo/native-production/v1" or data.get("rights_confirmed") is not True:
        raise ProductionError("Versioned manifest and explicit creator rights confirmation required")
    project=data.get("project")
    if not isinstance(project,str) or not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,63}",project):
        raise ProductionError("Invalid project identifier")
    shots=data.get("shots")
    if not isinstance(shots,list) or not 1<=len(shots)<=16:
        raise ProductionError("Provide 1–16 shots")
    root=path.parent
    result=[]
    for shot in shots:
        if not isinstance(shot,dict) or set(shot)-{"clip","caption","narration"}:
            raise ProductionError("Invalid shot fields")
        caption=shot.get("caption","")
        if not isinstance(caption,str) or len(caption)>200 or any(ord(c)<32 or ord(c)==127 for c in caption) or "-->" in caption:
            raise ProductionError("Caption must be one plain-text line up to 200 characters")
        result.append({"clip":asset(root,shot.get("clip"),{".mp4",".mov",".mkv",".webm",".m4v"}),
                       "caption":caption.strip(),
                       "narration":asset(root,shot["narration"],{".wav",".mp3",".m4a",".aac",".ogg"}) if "narration" in shot else None})
    score=asset(root,data["soundtrack"],{".wav",".mp3",".m4a",".aac",".ogg"}) if "soundtrack" in data else None
    return {"project":project,"shots":result,"soundtrack":score,"manifest_sha256":sha256(path)}

def execute(args, timeout=180):
    try:
        p=subprocess.run(args, capture_output=True,text=True,timeout=timeout,check=False)
    except (OSError,subprocess.TimeoutExpired) as exc:
        raise ProductionError("Local media command unavailable or timed out") from exc
    if p.returncode:
        raise ProductionError("Local media command failed: "+p.stderr[-500:])
    return p.stdout

def probe(path):
    return json.loads(execute(["ffprobe","-v","error","-show_entries",
        "format=duration:stream=codec_type,codec_name,width,height","-of","json",str(path)],30))

def audio_duration(path):
    if not 0<path.stat().st_size<=32*1024*1024:
        raise ProductionError("Narration exceeds 32 MiB or is empty")
    data=probe(path)
    if not any(s.get("codec_type")=="audio" for s in data.get("streams",[])):
        raise ProductionError("Narration file has no audio")
    duration=float(data.get("format",{}).get("duration",0))
    if not math.isfinite(duration) or duration<=0:
        raise ProductionError("Invalid narration duration")
    return duration

def timestamp(seconds):
    ms=round(seconds*1000)
    h,ms=divmod(ms,3600000)
    m,ms=divmod(ms,60000)
    s,ms=divmod(ms,1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def produce(manifest,output,receipt,captions,*,width=720,height=1280,fps=30):
    plan=load_plan(manifest)
    targets=[Path(p).expanduser().resolve() for p in (output,receipt,captions)]
    if len(set(targets))!=3 or any(p.exists() for p in targets) or [p.suffix.lower() for p in targets]!=[".mp4",".json",".srt"]:
        raise ProductionError("Use three distinct, new MP4, JSON and SRT output paths")
    if not 320<=width<=1920 or not 240<=height<=1920 or width%2 or height%2 or not 12<=fps<=60:
        raise ProductionError("Unsupported output dimensions or FPS")
    if not all(shutil.which(x) for x in ("ffmpeg","ffprobe")):
        raise ProductionError("Install FFmpeg and FFprobe locally")
    elapsed=0.0
    cues=[]
    voices=[]
    clips=[]
    try:
        for shot in plan["shots"]:
            clip=shot["clip"]
            duration=validate_clip(clip)["duration_s"]
            clips.append(clip)
            if shot["caption"]:
                cues.append((elapsed,elapsed+duration,shot["caption"]))
            if shot["narration"]:
                voice=shot["narration"]
                length=audio_duration(voice)
                if length>duration+0.04:
                    raise ProductionError("Narration exceeds its shot duration; adjust footage or recording")
                voices.append((voice,elapsed,length))
            elapsed+=duration
        if elapsed>=179:
            raise ProductionError("Production exceeds local renderer duration limit")
        with tempfile.TemporaryDirectory(prefix="makevideo-production-") as temp:
            tmp=Path(temp)
            base=tmp/"base.mp4"
            baseproof=render(clips,base,tmp/"base.json",width=width,height=height,fps=fps,soundtrack=plan["soundtrack"])
            final=tmp/"final.mp4"
            if voices:
                cmd=["ffmpeg","-nostdin","-v","error","-i",str(base)]
                for voice,_,_ in voices:
                    cmd.extend(["-i",str(voice)])
                graph=["[0:a]volume=0.24[bed]"]
                labels=["[bed]"]
                for idx,(_,start,_) in enumerate(voices,1):
                    delay=round(start*1000)
                    graph.append(f"[{idx}:a:0]aresample=48000,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS,adelay={delay}:all=1[n{idx}]")
                    labels.append(f"[n{idx}]")
                graph.append("".join(labels)+f"amix=inputs={len(labels)}:duration=first:normalize=0,alimiter=limit=0.95:level=0[a]")
                cmd.extend(["-filter_complex",";".join(graph),"-map","0:v:0","-map","[a]","-c:v","copy","-c:a","aac","-b:a","192k","-movflags","+faststart",str(final)])
                execute(cmd)
            else:
                shutil.copyfile(base,final)
            # Decode every stream, not merely inspect a container header.
            execute(["ffmpeg","-nostdin","-v","error","-xerror","-i",str(final),"-map","0:v:0","-map","0:a:0","-f","null","-"])
            info=probe(final)
            streams=info.get("streams",[])
            video=next((s for s in streams if s.get("codec_type")=="video"),{})
            audio=next((s for s in streams if s.get("codec_type")=="audio"),{})
            actual=float(info.get("format",{}).get("duration",0))
            if video.get("codec_name")!="h264" or audio.get("codec_name")!="aac" or video.get("width")!=width or video.get("height")!=height or not math.isfinite(actual) or abs(actual-elapsed)>1:
                raise ProductionError("Final media proof failed")
            srt=tmp/"captions.srt"
            srt.write_text("".join(f"{i}\n{timestamp(a)} --> {timestamp(b)}\n{c}\n\n" for i,(a,b,c) in enumerate(cues,1)),encoding="utf-8")
            proof={"schema":"makevideo/native-production-receipt/v1","state":"VERIFIED_LOCAL_RENDER",
                   "project":plan["project"],"manifest_sha256":plan["manifest_sha256"],
                   "base_continuity_fingerprint":baseproof["continuity_fingerprint"],
                   "output_sha256":sha256(final),"captions_sha256":sha256(srt),"duration_s":actual,
                   "width":width,"height":height,"fps":fps,"video_codec":"h264","audio_codec":"aac",
                   "narration":[{"sha256":sha256(p),"start_s":s,"duration_s":d} for p,s,d in voices],
                   "rights_status":"CREATOR_REPORTED","publish_authority":False,"release_authority":False,
                   "limitations":["Local edit, not generated cinematic footage","Captions are shot-timed, not word-aligned","Human audiovisual review and asset rights verification still required"]}
            report=tmp/"receipt.json"
            report.write_text(json.dumps(proof,indent=2)+"\n",encoding="utf-8")
            for target,source in zip(targets,(final,report,srt)):
                target.parent.mkdir(parents=True,exist_ok=True)
                # Exclusive creation prevents overwriting even if another process races us.
                with target.open("xb") as dst,source.open("rb") as src:
                    shutil.copyfileobj(src,dst)
            return proof
    except (RenderError,OSError,subprocess.TimeoutExpired) as exc:
        raise ProductionError(str(exc)) from exc

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("manifest",type=Path)
    p.add_argument("--output",type=Path,required=True)
    p.add_argument("--receipt",type=Path,required=True)
    p.add_argument("--captions",type=Path,required=True)
    p.add_argument("--width",type=int,default=720)
    p.add_argument("--height",type=int,default=1280)
    p.add_argument("--fps",type=int,default=30)
    a=p.parse_args()
    try:
        print(json.dumps(produce(a.manifest,a.output,a.receipt,a.captions,width=a.width,height=a.height,fps=a.fps),indent=2))
        return 0
    except (ProductionError,OSError,ValueError) as exc:
        p.exit(2,f"Production blocked: {exc}\n")

if __name__=="__main__":
    raise SystemExit(main())
