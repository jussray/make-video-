# Native production (local, provider-neutral)

Use your own moving footage and recorded or locally synthesized speech; no HeyGen,
Faceless Video Maker, Runway, external API, account, or credit purchase is needed
for this editing stage. This extends demo.py; it does not duplicate its motion
validation or claim to generate new cinematic footage.

Save a JSON file alongside creator-owned assets:

```json
{
  "schema": "makevideo/native-production/v1",
  "project": "signal-loop",
  "rights_confirmed": true,
  "shots": [
    {"clip":"footage/loop.mp4","narration":"audio/loop.wav","caption":"Build. Verify. Share."},
    {"clip":"footage/review.mp4","caption":"You control what goes live."}
  ],
  "soundtrack":"audio/score.wav"
}
```

```sh
python3 native_production.py plan.json --output out/ad.mp4 --receipt out/ad.json --captions out/ad.srt
python3 -m unittest discover -s demo_tests -v
```

The tool validates local assets, renders moving clips using the existing engine,
ducks the backing mix when voice tracks are present, positions each narration at
its shot start, exports shot-timed SRT captions, decodes the final H.264/AAC
video and writes a hash-bound receipt. Source assets and existing output files
are never overwritten. Output files may be partially created if storage fails
during final export; use fresh names after investigating. No authority is granted.

Voice recordings and cinematic footage must be supplied today. Local model
inference (including licensed voice synthesis and image-to-video) belongs in
StoryEngine/LEEVIZE and is not implemented by this edit. Captions are separate,
not burned in or word-aligned. Human audiovisual review, rights, and publication
approval remain independent gates.
