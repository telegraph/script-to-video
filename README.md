# script-to-video

Turn a narration script + slides into a polished narrated video with text-to-speech, transitions, and annotations.

**Write what you want to say. Drop in your slides. Get a video.**

```
narration.txt + slides/  ──→  s2v build  ──→  video.mp4
```

## Features

- **Text-to-Speech** — 400+ voices via Microsoft Edge TTS (50+ languages)
- **Slide Import** — PNGs, PowerPoint (.pptx), or Google Slides
- **Transitions** — 45+ FFmpeg xfade types (fade, wipe, dissolve, zoom, etc.)
- **Callout Annotations** — highlight regions on slides with label pills
- **QA Validation** — 13-point check before build (slide count, timing, terminology)
- **Subtitles** — auto-generated .srt and .vtt from narration
- **Thumbnails** — poster frame extraction from slide 1
- **Watch Mode** — auto-rebuild on narration or slide changes
- **Caching** — TTS audio is cached; unchanged chunks are skipped

## Quick Start

### Prerequisites

```bash
# Node.js 20+
node --version

# Edge TTS (Python CLI)
pip install edge-tts

# FFmpeg
brew install ffmpeg        # macOS
sudo apt install ffmpeg    # Ubuntu
choco install ffmpeg       # Windows
```

### Install

```bash
npm install -g script-to-video
```

### Create Your First Video

```bash
# Scaffold a new project
s2v init my-video

# Add your slides
cp ~/my-slides/*.png my-video/slides/
# (or use PowerPoint: set slides_source: pptx in demo.yaml)

# Edit the narration script
# One paragraph = one slide
nano my-video/narration.txt

# Build the video
s2v build my-video

# Find your video
open my-video/output/my-video.mp4
```

## Project Structure

```
my-video/
  demo.yaml          ← configuration (voice, transitions, etc.)
  narration.txt      ← your script (one paragraph per slide)
  callouts.json      ← optional: highlight annotations
  slides/            ← your slide images (slide-00.png, slide-01.png, …)
  output/            ← generated files
    chunks/          ← TTS audio per paragraph
    slides-annotated/← slides with callout overlays
    slide-timings.json
    my-video.mp4     ← your video
    my-video.srt     ← subtitles (if --subtitles)
```

## Configuration

### demo.yaml

```yaml
name: my-video
resolution: 1920x1080
voice: en-GB-RyanNeural        # Edge TTS voice name
rate: "-5%"                    # Speech rate (-10% slower, +20% faster)
pitch: "-2Hz"                  # Pitch shift (-4Hz deeper, +4Hz higher)
transition: fade               # xfade type (run: s2v transitions)
transition_duration: 0.4       # Transition length in seconds
tail_silence: 3.0              # Extra seconds on last slide
crf: 20                        # Video quality (0–51, lower = better)
slides_source: directory       # "directory", "pptx", or "google-slides"
slides_dir: slides             # Folder of PNGs (for directory source)
# slides_file: deck.pptx      # PowerPoint file (for pptx source)
# slides_id: 1BxiM...         # Google Slides ID (for google-slides source)
narration: narration.txt
callouts: callouts.json
# click_sound: click.wav      # Optional click sound to mix in

# Annotation styling (optional)
annotation_style:
  highlight_colour: "rgba(255,220,0,0.35)"
  border_colour: "#FFD700"
  label_bg: "#FFD700"
  label_text: "#1a1a1a"

# Custom QA rules (optional)
qa_rules:
  forbidden_words: ["TODO", "FIXME"]
  warn_words: ["hack", "workaround"]

# Text preprocessing (optional)
preprocess:
  colon_to_period: true        # "Title: Description" → "Title. Description"
  percent_to_word: true        # "42%" → "42 percent"
  ensure_trailing_period: true # Add "." if chunk doesn't end with punctuation
```

### Slide Sources

#### Directory of PNGs (default)

```yaml
slides_source: directory
slides_dir: slides      # folder containing slide-00.png, slide-01.png, …
```

Drop your images (PNG, JPG, WebP) into the slides folder. They'll be sorted alphabetically and renamed to `slide-00.png`, `slide-01.png`, etc.

#### PowerPoint

```yaml
slides_source: pptx
slides_file: presentation.pptx
```

Requires LibreOffice (`soffice`) installed:
```bash
brew install --cask libreoffice   # macOS
sudo apt install libreoffice      # Ubuntu
```

#### Google Slides

```yaml
slides_source: google-slides
slides_id: YOUR_PRESENTATION_ID_HERE
```

Requires authentication:
```bash
export GOOGLE_SLIDES_API_KEY=your-api-key
# OR
export GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

## CLI Reference

### `s2v build [dir]`

Full pipeline: import → TTS → annotate → QA → render.

```bash
s2v build                                    # Build from current directory
s2v build my-video                           # Build from subdirectory
s2v build --voice en-US-GuyNeural            # Override voice
s2v build --transition wipeleft              # Override transition
s2v build --crf 15                           # Higher quality
s2v build --skip-import                      # Skip slide import step
s2v build --skip-qa                          # Skip QA checks
s2v build --subtitles --thumbnail            # Generate extras
s2v build --watch                            # Rebuild on changes
s2v build -o ~/Desktop/final.mp4             # Custom output path
```

### `s2v import [dir]`

Import slides from PPTX or Google Slides to PNGs.

```bash
s2v import my-video
```

### `s2v narrate [dir]`

Generate TTS audio only (without full build).

```bash
s2v narrate my-video
s2v narrate --voice en-US-JennyNeural --rate "-3%"
```

### `s2v qa [dir]`

Run QA validation checks.

```bash
s2v qa my-video
s2v qa my-video --internal          # Flag "your" usage
s2v qa my-video --strict            # Treat warnings as failures
s2v qa my-video --custom-rules rules.json
```

### `s2v voices`

Browse available TTS voices.

```bash
s2v voices                          # Show recommended + full list
s2v voices --lang en                # English voices only
s2v voices --lang fr --gender Female
s2v voices --json                   # Machine-readable output
```

### `s2v transitions`

List all 45+ xfade transition types with descriptions.

```bash
s2v transitions
```

### `s2v init [name]`

Scaffold a new project.

```bash
s2v init my-video
s2v init my-video --voice en-US-GuyNeural
s2v init my-video --source pptx
s2v init my-video --source google-slides
s2v init my-video --resolution 1920x1080
```

### `s2v subtitles [dir]`

Generate subtitle files from narration + timings.

```bash
s2v subtitles my-video
s2v subtitles my-video --format srt     # SRT only
s2v subtitles my-video --format vtt     # VTT only
```

### `s2v thumbnail [dir]`

Extract poster frame from first slide.

```bash
s2v thumbnail my-video
s2v thumbnail my-video --width 320
s2v thumbnail my-video -o poster.png
```

## Narration Tips

### One paragraph = one slide

```
This is slide one. Write naturally, as if presenting to a colleague.

This is slide two. Each blank line separates slides.

This is slide three. Keep paragraphs focused on one idea.
```

### TTS-friendly writing

| Avoid | Use Instead | Why |
|-------|-------------|-----|
| PRs | pull requests | TTS reads "PRs" as "pee-arr-ess" |
| APIs | A P I endpoints | Spell out abbreviations |
| e.g. | for example | Reads better aloud |
| 42% | 42 percent | Auto-converted, but explicit is clearer |
| Jira | Jeera | Matches pronunciation |
| : | . | Colons create awkward pauses |

### Callout Annotations

Add `callouts.json` to highlight specific regions on slides:

```json
[
  {
    "slide": 0,
    "label": "Click here",
    "x": 100,
    "y": 200,
    "w": 300,
    "h": 50
  },
  {
    "slide": 2,
    "label": "New feature",
    "x": 500,
    "y": 100,
    "w": 400,
    "h": 200
  }
]
```

Coordinates are in pixels from the top-left of the slide.

## Examples

The `examples/` directory contains ready-to-build sample projects:

| Example | Voice | Transition | Description |
|---------|-------|-----------|-------------|
| `product-tour` | en-GB-RyanNeural | fade | Product walkthrough with callouts |
| `onboarding-video` | en-US-JennyNeural | wipeleft | Employee onboarding guide |
| `release-notes` | en-US-GuyNeural | dissolve | Release announcement with QA rules |
| `pptx-import` | en-GB-SoniaNeural | smoothleft | PowerPoint import demo |
| `google-slides-import` | en-US-AriaNeural | fade | Google Slides import demo |

Generate sample slides and build:

```bash
# Generate placeholder slides for examples
node scripts/generate-sample-slides.cjs

# Build any example
s2v build examples/product-tour
s2v build examples/onboarding-video
s2v build examples/release-notes
```

## Recommended Voices

| Voice | Gender | Accent | Best For |
|-------|--------|--------|----------|
| en-GB-RyanNeural | Male | British | Professional demos (default) |
| en-GB-SoniaNeural | Female | British | Executive presentations |
| en-US-GuyNeural | Male | American | Casual tutorials |
| en-US-JennyNeural | Female | American | Training, onboarding |
| en-US-AriaNeural | Female | American | Marketing, announcements |
| en-US-DavisNeural | Male | American | Technical deep-dives |
| fr-FR-HenriNeural | Male | French | French content |
| de-DE-ConradNeural | Male | German | German content |
| es-ES-AlvaroNeural | Male | Spanish | Spanish content |
| ja-JP-KeitaNeural | Male | Japanese | Japanese content |
| zh-CN-YunxiNeural | Male | Mandarin | Chinese content |
| hi-IN-MadhurNeural | Male | Hindi | Hindi content |
| ar-SA-HamedNeural | Male | Arabic | Arabic content |

Run `s2v voices` for the full list of 400+ voices across 50+ languages.

## Architecture

```
                    ┌──────────────┐
                    │ narration.txt│
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Slides   │ │Preprocess│ │ Callouts │
        │ Import   │ │  Chunks  │ │  (opt.)  │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │             │             │
             ▼             ▼             │
        ┌──────────┐ ┌──────────┐       │
        │ PNGs in  │ │ Edge TTS │       │
        │ slides/  │ │  → WAVs  │       │
        └────┬─────┘ └────┬─────┘       │
             │             │             │
             │        ┌────▼─────┐       │
             │        │ ffprobe  │       │
             │        │ timings  │       │
             │        └────┬─────┘       │
             │             │             │
             ▼             │             ▼
        ┌──────────────────┴─────────────────┐
        │         Annotate Slides            │
        │    (sharp + canvas overlays)       │
        └──────────────┬─────────────────────┘
                       │
                  ┌────▼─────┐
                  │   QA     │
                  │ Validate │
                  └────┬─────┘
                       │
                  ┌────▼─────┐
                  │  FFmpeg  │
                  │  xfade   │
                  └────┬─────┘
                       │
                  ┌────▼─────┐
                  │ video.mp4│
                  └──────────┘
```

## License

MIT
