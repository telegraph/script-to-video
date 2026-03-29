# Agent Instructions for script-to-video

This file provides context for AI coding agents (GitHub Copilot, Claude Code, Cursor, Cody, etc.) working on this repository.

## What This Project Does

`script-to-video` is a CLI tool that converts a narration script + slides into a polished narrated video with text-to-speech, transitions, and annotations.

**Input:** narration.txt + slides (PNGs, PPTX, or Google Slides) + optional config
**Output:** MP4 video with TTS narration, xfade transitions, and optional subtitles

## Architecture

```
User provides:
  narration.txt      → plain text, one paragraph per slide
  slides/            → PNG images (or PPTX / Google Slides ID)
  demo.yaml          → optional configuration
  callouts.json      → optional highlight annotations

Pipeline:
  Import → Preprocess → TTS → Timings → Annotate → QA → FFmpeg → MP4

Modules (lib/):
  config.js          → YAML config + CLI merge + defaults
  import-slides.js   → directory / PPTX / Google Slides → PNGs
  preprocess.js      → narration text → TTS-ready chunks
  tts.js             → Edge TTS → WAV audio per chunk
  timings.js         → ffprobe → slide-timings.json
  annotate.js        → callouts.json → highlighted PNGs (sharp + canvas)
  ffmpeg-builder.js  → generates FFmpeg xfade build script
  qa.js              → 13-point validation framework
  subtitles.js       → SRT / VTT generation
  thumbnail.js       → poster frame extraction
  transitions.js     → xfade transition gallery (45+ types)
  voices.js          → Edge TTS voice browser (25+ recommended)
  build.js           → full pipeline orchestrator
  narrate.js         → standalone TTS generation
  init.js            → project scaffolding
  capture.js         → optional Playwright passthrough
```

## Key Design Decisions

1. **No Playwright dependency** — slides are user-provided (PNGs, PPTX export, Google Slides). Capture is intentionally out of scope because it's app-specific and fragile.
2. **CommonJS** — uses require/module.exports for broad Node.js compatibility.
3. **Config cascade** — defaults → demo.yaml → CLI flags. Every option works at every level.
4. **Modular pipeline** — each step can run independently via CLI subcommands.
5. **Caching** — TTS audio is cached; WAV files newer than their text source are skipped.

## External Dependencies (System)

| Tool | Required For | Install |
|------|-------------|---------|
| edge-tts | TTS audio | `pip install edge-tts` |
| ffmpeg | Video assembly | `brew install ffmpeg` / apt / choco |
| ffprobe | Audio timing | (comes with ffmpeg) |
| soffice | PPTX import | `brew install --cask libreoffice` (optional) |

## Common Tasks

### Add a new CLI command
1. Add command definition in `bin/s2v.js`
2. Create handler module in `lib/`
3. Wire config options through `lib/config.js`

### Add a new QA check
Edit `lib/qa.js` — add to the relevant section or use custom rules in demo.yaml:
```yaml
qa_rules:
  forbidden_words: ["TODO", "FIXME"]
  warn_words: ["maybe", "probably"]
```

### Add a new transition
Edit `lib/transitions.js` — add entry to the TRANSITIONS array.

### Add a new voice recommendation
Edit `lib/voices.js` — add entry to the RECOMMENDED object.

## Testing

```bash
# Full build with sample project
node bin/s2v.js build examples/product-tour

# QA only
node bin/s2v.js qa examples/product-tour

# List voices
node bin/s2v.js voices --lang en

# List transitions
node bin/s2v.js transitions

# Scaffold new project
node bin/s2v.js init test-project
```
