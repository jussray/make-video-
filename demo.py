#!/usr/bin/env python3
"""Executable two-source MAKEVIDEO proof assembler; requires ffmpeg and ffprobe.

Example: python demo.py --cinematic shot.mp4 --runtime recorded-app.mp4
           --source-sha <real-app-commit> --output output.mp4

Inputs are caller-supplied. This does not authenticate the runtime or approve publishing.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

def execute(*args):
    p = subprocess.run(args, capture_output=True, text=True, check=False)
    if p.returncode:
        raise RuntimeError(f"Command failed ({args[0]}): {p.stderr[-1800:]}")
    return p.stdout

def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return 'sha256:' + digest.hexdigest()

def probe(path):
    raw = execute('ffprobe', '-v', 'error', '-show_entries',
                  'format=duration:stream=codec_type,codec_name,width,height',
                  '-of', 'json', str(path))
    info = json.loads(raw)
    video = next((s for s in info.get('streams', []) if s.get('codec_type') == 'video'), None)
    duration = float(info.get('format', {}).get('duration', 0))
    if not video or duration < 1 or not video.get('width') or not video.get('height'):
        raise ValueError(f'Not a valid ≥1-second video: {path}')
    return {'duration_seconds': round(duration, 3), 'width': video['width'],
            'height': video['height'], 'codec': video.get('codec_name', 'unknown')}

def motion_check(path, duration):
    """Low-resolution frame difference only; NOT proof of live action or authenticity."""
    seconds = min(duration, 15)
    frames = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path),
                             '-t', str(seconds), '-vf', 'fps=3,scale=64:36,format=gray',
                             '-f', 'rawvideo', '-'], capture_output=True, check=False)
    if frames.returncode:
        raise RuntimeError('Unable to sample video frames')
    frame_size = 64 * 36
    samples = [frames.stdout[i:i+frame_size] for i in range(0, len(frames.stdout), frame_size)
               if len(frames.stdout[i:i+frame_size]) == frame_size]
    distinct = len({hashlib.sha256(f).digest() for f in samples})
    if len(samples) < 3 or distinct < 3:
        raise ValueError(f'Insufficient recorded frame changes: {path}; no slideshow-as-video substitution')
    return {'sampled_frames': len(samples), 'distinct_frames': distinct,
            'motion_authenticity_verified': False}

def assemble(cinematic, runtime, source_sha, output, audio=None):
    if not 7 <= len(source_sha) <= 64 or not all(c in '0123456789abcdefABCDEF' for c in source_sha):
        raise ValueError('source-sha must be an actual Git SHA (7-64 hexadecimal characters)')
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        raise RuntimeError('ffmpeg and ffprobe must be installed')
    cinematic, runtime, output = map(Path, (cinematic, runtime, output))
    if not cinematic.is_file() or not runtime.is_file() or cinematic.resolve() == runtime.resolve():
        raise ValueError('Two distinct existing cinematic and real runtime-capture videos are required')
    first, second = probe(cinematic), probe(runtime)
    first_motion = motion_check(cinematic, first['duration_seconds'])
    second_motion = motion_check(runtime, second['duration_seconds'])
    output.parent.mkdir(parents=True, exist_ok=True)
    base = ['ffmpeg', '-y', '-loglevel', 'error', '-i', str(cinematic), '-i', str(runtime)]
    if audio:
        audio = Path(audio)
        if not audio.is_file():
            raise ValueError('Audio source file is missing')
        base += ['-i', str(audio)]
    video_filter = (
      '[0:v]fps=24,scale=1280:720:force_original_aspect_ratio=decrease,'
      'pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p,'
      "drawtext=text='Illustrative footage':x=28:y=h-55:fontsize=27:fontcolor=white:"
      'box=1:boxcolor=black@0.7:boxborderw=10[v0];'
      '[1:v]fps=24,scale=1280:720:force_original_aspect_ratio=decrease,'
      'pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p[v1];'
      '[v0][v1]concat=n=2:v=1:a=0[v]'
    )
    cmd = base + ['-filter_complex', video_filter, '-map', '[v]']
    if audio:
        cmd += ['-map', '2:a:0', '-af', 'apad', '-t',
                str(first['duration_seconds'] + second['duration_seconds'])]
    cmd += ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '160k', str(output)]
    execute(*cmd)
    final = probe(output)
    if not 0 < final['duration_seconds'] < 180:
        raise ValueError('Rendered MP4 must be under three minutes')
    receipt = {
      'status': 'MEDIA_RENDERED_NOT_PUBLISH_APPROVED', 'created_at': datetime.now(timezone.utc).isoformat(),
      'output_file': output.name, 'output_sha256': sha256(output), 'output_probe': final,
      'release_authorized': False, 'evidence_authenticity_verified': False,
      'shots': [
        {'kind': 'cinematic', 'truth_class': 'ILLUSTRATIVE', 'source': cinematic.name,
         'source_sha256': sha256(cinematic), 'probe': first, 'frame_sampling': first_motion,
         'disclosure': 'Illustrative footage'},
        {'kind': 'product-demo', 'truth_class': 'UNKNOWN',
         'runtime_capture_attested_by_caller': True, 'source': runtime.name,
         'source_sha256': sha256(runtime), 'runtime_source_commit': source_sha,
         'probe': second, 'frame_sampling': second_motion}
      ],
      'limitations': ['Frame changes do not prove that footage depicts genuine actions.',
                      'Runtime footage and source commit are caller-supplied and not independently authenticated.',
                      'Human truth/rights/continuity review and publication approval are still required.']
    }
    receipt_path = output.with_suffix('.receipt.json')
    receipt_path.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf8')
    return output, receipt_path

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cinematic', required=True)
    parser.add_argument('--runtime', required=True)
    parser.add_argument('--source-sha', required=True)
    parser.add_argument('--audio', help='Optional licensed soundtrack or narration')
    parser.add_argument('--output', default='makevideo-demo.mp4')
    args = parser.parse_args()
    output, receipt = assemble(args.cinematic, args.runtime, args.source_sha, args.output, args.audio)
    print(f'Rendered {output}; receipt {receipt}; NOT approved for publication')

if __name__ == '__main__':
    main()
