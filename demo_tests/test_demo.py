import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from demo import RenderError, render


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'Requires installed ffmpeg/ffprobe')
class RenderFlowTests(unittest.TestCase):
    def test_produces_real_motion_mp4_with_native_and_silent_sources(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            moving = root/'real-motion.mp4'
            silent = root/'silent-motion.mp4'
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=640x360:rate=24:duration=1','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',str(moving)],check=True)
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=640x360:rate=24:duration=1','-c:v','libx264','-pix_fmt','yuv420p','-an',str(silent)],check=True)
            output, receipt = root/'joined.mp4', root/'proof.json'
            result=render([moving,silent],output,receipt,width=640,height=360)
            self.assertEqual(result['state'],'VERIFIED_LOCAL_RENDER')
            self.assertGreater(output.stat().st_size,1024)
            self.assertEqual(result['output']['audio_codec'],'aac')
            self.assertLess(abs(result['output']['duration_s']-2),0.3)
            self.assertEqual(result['output']['sha256'],json.loads(receipt.read_text())['output']['sha256'])
            self.assertFalse(result['continuity_cookie']['publish_authority'])
            self.assertEqual(moving.read_bytes()[:8], (root/'real-motion.mp4').read_bytes()[:8])
            with self.assertRaises(RenderError):render([moving,silent],output,receipt,width=640,height=360)

    def test_empty_clip_list_fails_closed(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            with self.assertRaises(RenderError):render([],root/'a.mp4',root/'a.json')


if __name__ == '__main__':unittest.main()