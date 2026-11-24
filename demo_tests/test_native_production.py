import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from native_production import load_plan, produce, ProductionError

class NativeProductionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.plan = self.root / "plan.json"
        self.data = {"schema":"makevideo/native-production/v1","project":"signal-loop",
                     "rights_confirmed":True,"shots":[{"clip":"scene.mp4","caption":"Build. Verify."}]}
    def write(self):
        self.plan.write_text(json.dumps(self.data), encoding="utf-8")
    def test_reject_unconfirmed_rights(self):
        self.data["rights_confirmed"] = False
        self.write()
        with self.assertRaises(ProductionError):
            load_plan(self.plan)
    def test_reject_traversal_and_remote_assets(self):
        for value in ("../outside.mp4", "https://example.invalid/clip.mp4", "/tmp/a.mp4"):
            self.data["shots"][0]["clip"] = value
            self.write()
            with self.assertRaises(ProductionError):
                load_plan(self.plan)
    def test_reject_caption_injection(self):
        self.data["shots"][0]["caption"] = "text\n\n99\n00:00:00,000 --> 00:00:01,000"
        self.write()
        with self.assertRaises(ProductionError):
            load_plan(self.plan)
    @unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "FFmpeg required")
    def test_actual_mp4_voice_caption_and_receipt(self):
        subprocess.run(["ffmpeg","-v","error","-f","lavfi","-i","testsrc2=size=320x240:rate=24",
                        "-t","2","-c:v","libx264","-pix_fmt","yuv420p",str(self.root/"scene.mp4")],check=True)
        subprocess.run(["ffmpeg","-v","error","-f","lavfi","-i","sine=frequency=440:duration=1",
                        str(self.root/"voice.wav")],check=True)
        self.data["shots"][0]["narration"] = "voice.wav"
        self.write()
        out = self.root/"out.mp4"
        proof = produce(self.plan,out,self.root/"out.json",self.root/"out.srt",width=320,height=240)
        self.assertEqual(proof["state"],"VERIFIED_LOCAL_RENDER")
        self.assertFalse(proof["publish_authority"])
        self.assertTrue(out.stat().st_size > 1024)
        self.assertIn("Build. Verify.",(self.root/"out.srt").read_text())
        self.assertEqual(len(proof["narration"]),1)
        self.assertEqual(proof["decoded_frames"],60)
        self.assertEqual(proof["fps"],30)
        self.assertTrue(proof["full_decode"])
        self.assertEqual(proof["output_bytes"],out.stat().st_size)
        with self.assertRaises(ProductionError):
            produce(self.plan,out,self.root/"out.json",self.root/"out.srt",width=320,height=240)
