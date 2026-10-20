#!/usr/bin/env python3
"""MakeVideo local proof-of-motion renderer. No generative-AI or publishing claims.

Usage: python3 demo.py --clips footage/shot1.mp4 footage/shot2.mp4 --output out/film.mp4

Requires FFmpeg+FFprobe with libx264/aac. Uses only creator-supplied local footage;
never uploads files, invokes remote models, or publishes the result.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

MAX_INPUT_BYTES = 250 * 1024 * 1024
MAX_DURATION_S = 179.0  # Keeps proof exports under common three-minute submission limit.
MAX_CLIPS = 16
EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".m4v"}


class RenderError(ValueError):
    pass


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run_json(command: list[str]) -> dict:
    proc = subprocess.run(command, check=False, text=True, capture_output=True)
    if proc.returncode:
        raise RenderError(f"Media probe failed: {proc.stderr.strip()[-400:]}")
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as error:
        raise RenderError("Media probe returned invalid JSON.") from error



def observe_frame_changes(path: Path, duration: float) -> dict:
    """Bounded frame-change probe. Does not certify real-life action or media origin."""
    sample_seconds = min(6.0, duration)
    proc = subprocess.run(
        ["ffmpeg", "-nostdin", "-v", "error", "-i", str(path),
         "-t", str(sample_seconds), "-vf", "fps=4,scale=48:27,format=gray",
         "-f", "rawvideo", "-"],
        capture_output=True, check=False, timeout=45
    )
    frame_size = 48 * 27
    frames = [proc.stdout[i:i + frame_size]
              for i in range(0, len(proc.stdout), frame_size)
              if len(proc.stdout[i:i + frame_size]) == frame_size]
    if proc.returncode or len(frames) < 2:
        raise RenderError("Cannot read enough frames to verify basic video motion.")
    # Ignore minor codec noise: at least one frame-pair needs 3% of pixels
    # to differ by nine or more grayscale levels.
    changed = [sum(abs(a-b) >= 9 for a, b in zip(f1, f2))
               for f1, f2 in zip(frames, frames[1:])]
    most_changed = max(changed, default=0)
    if most_changed < int(frame_size * 0.03):
        raise RenderError("Input appears static in its opening samples. Supply moving footage.")
    return {"sampled_frames": len(frames), "max_changed_pixels": most_changed,
            "frame_change_observed": True, "motion_authenticity_verified": False}


def validate_clip(path: Path) -> dict:
    if path.suffix.lower() not in EXTENSIONS or not path.is_file():
        raise RenderError(f"Provide a local video clip (.mp4/.mov/.mkv/.webm/.m4v): {path}")
    if not 1024 <= path.stat().st_size <= MAX_INPUT_BYTES:
        raise RenderError(f"Video clip is empty or exceeds 250 MiB: {path}")
    probe = run_json(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=index,codec_type,codec_name,width,height", "-of", "json", str(path)])
    streams = probe.get("streams", [])
    videos = [s for s in streams if s.get("codec_type") == "video"]
    if not videos or not videos[0].get("width") or not videos[0].get("height"):
        raise RenderError(f"Clip has no readable video stream: {path}")
    try:
        duration = float(probe["format"]["duration"])
    except (KeyError, TypeError, ValueError) as error:
        raise RenderError(f"Clip has no measurable duration: {path}") from error
    if not 0.2 <= duration <= 120:
        raise RenderError(f"Clip duration is outside 0.2–120 seconds: {path}")
    return {"path": str(path), "duration_s": duration, "has_audio": any(s.get("codec_type") == "audio" for s in streams), "sha256": sha256(path), "motion_probe": observe_frame_changes(path, duration)}


def render(clips: list[Path], output: Path, receipt: Path, *, fps: int = 24, width: int = 1280, height: int = 720, soundtrack: Path | None = None) -> dict:
    for executable in ("ffmpeg", "ffprobe"):
        if not shutil.which(executable):
            raise RenderError(f"{executable} is required; no synthetic success is reported.")
    if not 1 <= len(clips) <= MAX_CLIPS:
        raise RenderError("Provide between one and sixteen real moving video clips.")
    if width < 320 or height < 240 or width % 2 or height % 2 or not 12 <= fps <= 60:
        raise RenderError("Output dimensions must be even and at least 320×240; FPS 12–60.")
    clips = [item.expanduser().resolve(strict=True) for item in clips]
    output, receipt = output.expanduser().resolve(), receipt.expanduser().resolve()
    inputs = [validate_clip(item) for item in clips]
    total = sum(item["duration_s"] for item in inputs)
    if total >= MAX_DURATION_S:
        raise RenderError(f"Total {total:.2f}s is too long; require less than {MAX_DURATION_S}s.")
    sound_info = None
    if soundtrack:
        soundtrack = soundtrack.expanduser().resolve(strict=True)
        if soundtrack.suffix.lower() not in {".mp3", ".wav", ".m4a", ".aac", ".ogg"} or not soundtrack.is_file():
            raise RenderError("Soundtrack must be a local supported audio file.")
        if soundtrack.stat().st_size > 32 * 1024 * 1024:
            raise RenderError("Soundtrack exceeds 32 MiB.")
        check = run_json(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type", "-of", "json", str(soundtrack)])
        if not any(s.get("codec_type") == "audio" for s in check.get("streams", [])):
            raise RenderError("Soundtrack has no audio stream.")
        sound_info = {"path": str(soundtrack), "sha256": sha256(soundtrack)}
    sources = set(clips + ([soundtrack] if soundtrack else []))
    if output == receipt or output in sources or receipt in sources:
        raise RenderError("Output and receipt must not overwrite the source files or each other.")
    if output.suffix.lower() != ".mp4" or receipt.suffix.lower() != ".json":
        raise RenderError("Output must be .mp4 and receipt must be .json.")
    if output.exists() or receipt.exists():
        raise RenderError("Refusing to overwrite an existing output or receipt; use fresh paths.")
    output.parent.mkdir(parents=True, exist_ok=True)
    receipt.parent.mkdir(parents=True, exist_ok=True)
    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-y"]
    for item in clips:
        command.extend(["-i", str(item)])
    if soundtrack:
        command.extend(["-stream_loop", "-1", "-i", str(soundtrack)])
    graph = []
    labels = []
    for i, item in enumerate(inputs):
        graph.append(f"[{i}:v:0]fps={fps},scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},setsar=1,format=yuv420p,setpts=PTS-STARTPTS[v{i}]")
        if item["has_audio"]:
            graph.append(f"[{i}:a:0]aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,asetpts=PTS-STARTPTS,apad,atrim=duration={item['duration_s']:.6f}[a{i}]")
        else:
            graph.append(f"anullsrc=r=48000:cl=stereo,atrim=duration={item['duration_s']:.6f},asetpts=PTS-STARTPTS[a{i}]")
        labels.append(f"[v{i}][a{i}]")
    graph.append("".join(labels) + f"concat=n={len(inputs)}:v=1:a=1[video][native]")
    audio_label = "native"
    if soundtrack:
        graph.append(f"[{len(inputs)}:a:0]aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.18,atrim=duration={total:.6f},asetpts=PTS-STARTPTS[score]")
        graph.append("[native][score]amix=inputs=2:duration=first:normalize=0[audio]")
        audio_label = "audio"
    command.extend(["-filter_complex", ";".join(graph), "-map", "[video]", "-map", f"[{audio_label}]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(output)])
    try:
        proc = subprocess.run(command, text=True, capture_output=True, check=False)
        if proc.returncode:
            raise RenderError("FFmpeg render failed: " + proc.stderr.strip()[-1000:])
        final = run_json(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height", "-of", "json", str(output)])
        streams = final.get("streams", [])
        video = next((s for s in streams if s.get("codec_type") == "video"), None)
        audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
        duration = float(final.get("format", {}).get("duration", 0))
        if (not video or video.get("codec_name") != "h264" or video.get("width") != width or video.get("height") != height or not audio or audio.get("codec_name") != "aac" or abs(duration-total) > 1.0):
            raise RenderError("Output proof failed codec, dimensions, audio or duration checks.")
        fingerprint = hashlib.sha256(json.dumps({"inputs": inputs, "soundtrack": sound_info, "fps": fps, "width": width, "height": height}, sort_keys=True).encode()).hexdigest()
        evidence = {
            "schema": "makevideo/local-motion-render/v1", "state": "VERIFIED_LOCAL_RENDER", "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "continuity_fingerprint": fingerprint, "continuity_cookie": {"parent": fingerprint[:16], "release_authority": False, "publish_authority": False},
            "inputs": inputs, "soundtrack": sound_info, "output": {"path": str(output), "sha256": sha256(output), "duration_s": duration, "width": width, "height": height, "video_codec": "h264", "audio_codec": "aac"},
            "limitations": ["Local FFmpeg edit of actual source video clips, not an AI-generated film", "Input copyright/consent and human review not verified", "No network, model access, export approval or publication"],
        }
        receipt.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        return evidence
    except Exception:
        if output.exists():
            output.unlink()  # Discard invalid output, never an existing source.
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--clips", type=Path, nargs="+", required=True, help="Local video clips, ordered as they should play")
    parser.add_argument("--soundtrack", type=Path, help="Optional local rights-cleared music mixed quietly under source audio")
    parser.add_argument("--output", type=Path, default=Path("out/makevideo-demo.mp4"))
    parser.add_argument("--receipt", type=Path, default=Path("out/makevideo-demo.receipt.json"))
    parser.add_argument("--fps", type=int, default=24)
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=720)
    args = parser.parse_args()
    try:
        result = render(args.clips, args.output, args.receipt, fps=args.fps, width=args.width, height=args.height, soundtrack=args.soundtrack)
        print(json.dumps({"result": result["state"], "output": result["output"], "receipt": str(args.receipt)}, indent=2))
        return 0
    except (RenderError, FileNotFoundError) as error:
        print(f"MakeVideo render blocked: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())