import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from examples.cinematic_product_demo import assemble

@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'requires ffmpeg and ffprobe')
class VideoAssemblyTests(unittest.TestCase):
    def test_real_mp4_and_byte_bound_receipt(self):
        with tempfile.TemporaryDirectory() as d:
            base=Path(d)
            inputs=[]
            for idx,src in enumerate(('testsrc2','testsrc')):
                p=base/f'input{idx}.mp4'
                subprocess.run(['ffmpeg','-y','-loglevel','error','-f','lavfi',
                     '-i',f'{src}=size=320x180:rate=10:duration=2',
                     '-c:v','libx264','-pix_fmt','yuv420p',str(p)],check=True)
                inputs.append(p)
            out=base/'film.mp4'
            media, receipt=assemble(inputs[0],inputs[1],'c079666627f7e3ee544b1ecd97910b000329394c',out)
            self.assertGreater(media.stat().st_size,1024)
            parsed=json.loads(receipt.read_text())
            self.assertEqual(parsed['output_file'],'film.mp4')
            self.assertEqual(parsed['status'],'MEDIA_RENDERED_NOT_PUBLISH_APPROVED')
            self.assertEqual(parsed['shots'][1]['truth_class'],'UNKNOWN')
            self.assertFalse(parsed['evidence_authenticity_verified'])
            self.assertFalse(parsed['release_authorized'])

    def test_missing_sources_fail_closed(self):
        with self.assertRaises(ValueError):
            assemble('missing.mp4','missing-too.mp4','c079666627f7e3ee544b1ecd97910b000329394c','out.mp4')

    def test_invalid_sha_fails_closed(self):
        with self.assertRaises(ValueError):
            assemble('missing.mp4','other.mp4','not-a-sha','out.mp4')

    def test_refuses_overwriting_either_source(self):
        with tempfile.TemporaryDirectory() as directory:
            first=Path(directory)/'a.mp4'
            second=Path(directory)/'b.mp4'
            first.write_bytes(b'test')
            second.write_bytes(b'test')
            with self.assertRaisesRegex(ValueError,'cannot overwrite input'):
                assemble(first,second,'c079666627f7e3ee544b1ecd97910b000329394c',first)

    def test_existing_output_and_receipt_do_not_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            first, second = root/'a.mp4',root/'b.mp4'
            first.write_bytes(b'fixture');second.write_bytes(b'fixture')
            output=root/'out.mp4'
            output.write_bytes(b'protected')
            with self.assertRaisesRegex(ValueError,'already exists'):
                assemble(first,second,'c079666627f7e3ee544b1ecd97910b000329394c',output)
            self.assertEqual(output.read_bytes(),b'protected')
            output.unlink()
            output.with_suffix('.receipt.json').write_bytes(b'protected-receipt')
            with self.assertRaisesRegex(ValueError,'already exists'):
                assemble(first,second,'c079666627f7e3ee544b1ecd97910b000329394c',output)
            self.assertFalse(output.exists())
