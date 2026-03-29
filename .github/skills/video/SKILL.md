# Video Generation Skill

Generate narrated demo videos from a script and slides using `script-to-video`.

## When to use

- User asks to create a demo video, walkthrough, or narrated presentation
- User wants to turn slides + narration into a video
- User points to a Google Doc, Google Slides, PowerPoint, or Drive folder for video creation
- User asks about TTS voices, transitions, or video generation

## Prerequisites

The following must be installed on the system:
- Node.js 20+
- FFmpeg (`brew install ffmpeg` / `apt install ffmpeg`)
- edge-tts (`pip install edge-tts`)

## Quick reference

All commands use `npx s2v` — no repo checkout needed.

### Scaffold a new video project

```bash
npx s2v init <name>
# Creates: <name>/demo.yaml, narration.txt, callouts.json, slides/, output/
```

### Build a video

```bash
npx s2v build <dir>
npx s2v build <dir> --voice en-US-JennyNeural --transition wipeleft
npx s2v build <dir> --music ambient --subtitles --thumbnail
```

### Import slides from PowerPoint or Google Slides

```bash
# Set in demo.yaml:
#   slides_source: pptx
#   slides_file: presentation.pptx
npx s2v import <dir>
```

### List voices, transitions, music

```bash
npx s2v voices
npx s2v transitions
npx s2v music
```

## Project structure

```
my-video/
  demo.yaml          # Config (voice, transition, resolution, etc.)
  narration.txt      # Script — one paragraph per slide
  callouts.json      # Optional: highlight regions on slides
  slides/            # slide-00.png, slide-01.png, …
  output/            # Generated video, audio, subtitles
```

## demo.yaml options

```yaml
name: my-video
resolution: 1920x1080          # or 1680x1050
voice: en-GB-RyanNeural        # Edge TTS voice
rate: "-5%"                    # Speech rate (-10% to +20%)
pitch: "-2Hz"                  # Pitch shift (-4Hz to +4Hz)
transition: fade               # xfade type (45+ available)
transition_duration: 0.4       # Seconds
tail_silence: 3.0              # Extra seconds on last slide
crf: 20                        # Video quality (0-51, lower=better)
slides_source: directory       # "directory", "pptx", or "google-slides"
slides_dir: slides             # Folder of PNGs
# slides_file: deck.pptx      # For pptx source
# slides_id: 1BxiM...         # For google-slides source
background_music: ambient      # Built-in preset or file path
music_volume: 0.15             # 0.0-1.0
```

## narration.txt format

Each paragraph = one slide. Write naturally:

```
Title slide text goes here. This is what the TTS will read for slide zero.

Second slide narration. Write as if presenting to a colleague. Avoid abbreviations.

Third slide. Spell out things like "pull requests" not "PRs" and "A P I" not "APIs".
```

## Available voices (English)

| Voice | Accent | Gender | Best for |
|-------|--------|--------|----------|
| en-GB-RyanNeural | British | Male | Professional demos (default) |
| en-GB-SoniaNeural | British | Female | Executive presentations |
| en-US-GuyNeural | American | Male | Casual tutorials |
| en-US-JennyNeural | American | Female | Training, onboarding |
| en-US-AriaNeural | American | Female | Marketing, announcements |
| en-US-DavisNeural | American | Male | Technical deep-dives |

## Available music presets

| Preset | Style |
|--------|-------|
| ambient | Warm pad — professional demos |
| upbeat | Rhythmic — product launches |
| corporate | Neutral — internal videos |
| lofi | Mellow — casual tutorials |
| minimal | Subtle drone — barely-there |
| calm | Gentle pad — training content |

## Popular transitions

`fade` (default), `dissolve`, `wipeleft`, `smoothleft`, `circleopen`, `fadeblack`, `zoomin`, `radial`

Run `npx s2v transitions` for all 45+.

## Workflow for agents

### Fastest path: from a Google Doc

If the user points you to a Google Doc (narration) and/or a folder of slides:

```bash
# Google Doc → video project (doc must be shared as "Anyone with link can view")
npx s2v from-doc "https://docs.google.com/document/d/DOC_ID/edit" \
  --name my-video \
  --voice en-US-JennyNeural \
  --music ambient

# With slides from a local folder
npx s2v from-doc "https://docs.google.com/document/d/DOC_ID/edit" \
  --slides ./screenshots/ \
  --name my-video

# With slides from Google Drive folder
npx s2v from-doc "https://docs.google.com/document/d/DOC_ID/edit" \
  --slides "https://drive.google.com/drive/folders/FOLDER_ID" \
  --name my-video

# Then build
npx s2v build my-video
```

### Standard path: manual setup

1. Check prerequisites: `which ffmpeg && which edge-tts`
2. Scaffold: `npx s2v init <name>`
3. Write `narration.txt` with one paragraph per slide
4. Get slides into `slides/` (user provides PNGs, or set up PPTX/Google Slides import)
5. Edit `demo.yaml` to set voice, transition, music
6. Build: `npx s2v build <name>`
7. Output is at `<name>/output/<name>.mp4`

### From Google Slides or PowerPoint

```bash
# Google Slides — set slides_source in demo.yaml
npx s2v init my-video --source google-slides
# Edit demo.yaml → set slides_id to the presentation ID
npx s2v build my-video

# PowerPoint — set slides_source in demo.yaml
npx s2v init my-video --source pptx
# Place .pptx file in directory
npx s2v build my-video
```

Do NOT create callouts.json unless you have real screenshot slides with known pixel coordinates.
