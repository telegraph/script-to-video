# Claude Code Instructions for script-to-video

## Project Overview

`script-to-video` (CLI: `s2v`) turns a narration script + slides into a narrated video using Edge TTS and FFmpeg.

## Architecture

- `bin/s2v.js` — CLI entry point
- `lib/` — modular pipeline steps (config → preprocess → tts → timings → annotate → ffmpeg → output)
- `examples/` — sample projects users can run immediately
- Each lib module is independent and testable in isolation

## Code Style

- CommonJS (require/module.exports) — no ESM
- Use chalk for coloured console output
- Config flows through loadConfig() from lib/config.js
- Every demo.yaml option must also be settable via CLI flag
- Write actual Unicode characters, never \uXXXX escapes

## Pipeline Convention

- 1 paragraph in narration.txt = 1 slide
- Slides: slide-00.png, slide-01.png, …
- Audio chunks: p00.wav, p01.wav, …
- All generated output goes to output/ subdirectory

## Testing Changes

```bash
node bin/s2v.js build examples/product-tour
node bin/s2v.js qa examples/product-tour
node bin/s2v.js voices --lang en
```
