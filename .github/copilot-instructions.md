# Copilot Instructions for script-to-video

## Project Overview

`script-to-video` is a CLI tool that turns a narration script + slides into a polished narrated video. It uses Edge TTS for speech synthesis, FFmpeg for video assembly, and supports slide import from PNGs, PowerPoint, and Google Slides.

## Architecture

```
bin/s2v.js           CLI entry point (commander.js)
lib/
  config.js          YAML config loader + defaults
  build.js           Main orchestrator (full pipeline)
  preprocess.js      Narration text → TTS-ready chunks
  tts.js             Edge TTS audio generation
  timings.js         ffprobe-based timing calculator
  annotate.js        Callout overlays via sharp + canvas
  ffmpeg-builder.js  FFmpeg xfade script generator
  import-slides.js   Slide importers (directory/PPTX/Google Slides)
  qa.js              13-point QA validation framework
  subtitles.js       SRT/VTT generation
  thumbnail.js       Poster frame extraction
  transitions.js     xfade transition gallery
  voices.js          Edge TTS voice browser
  init.js            Project scaffolding
  capture.js         Optional Playwright capture passthrough
  narrate.js         Standalone narration command
```

## Pipeline Flow

```
Slides (PNGs / PPTX / Google Slides)
  → Import to output/slides/slide-00.png, slide-01.png, …
Narration (narration.txt)
  → Preprocess into output/chunks/p00.txt, p01.txt, …
  → Edge TTS → output/chunks/p00.wav, p01.wav, …
  → ffprobe → output/slide-timings.json
  → Annotate (callouts.json) → output/slides-annotated/
  → FFmpeg xfade assembly → output/{name}.mp4
```

## Key Conventions

- One paragraph in narration.txt = one slide
- Slides are numbered slide-00.png, slide-01.png, …
- Config lives in demo.yaml (YAML, not JSON)
- All generated files go to output/
- CLI command is `s2v` (short for script-to-video)

## When Modifying Code

- Keep modules independent — each lib/ file handles one pipeline step
- Config flows through loadConfig() — never hardcode paths
- Support CLI flag overrides for every demo.yaml option
- Use chalk for console output (green = success, yellow = warning, red = error)
- Test with `node bin/s2v.js <command>` locally

## External Dependencies

- **edge-tts** (Python CLI) — `pip install edge-tts`
- **ffmpeg / ffprobe** — system package
- **LibreOffice** (soffice) — only for PPTX import
- **Google APIs** — only for Google Slides import
- **sharp + canvas** — Node native modules for image processing
