# script-to-video — Demo Gallery

> Turn a narration script + slides into a polished narrated video.

## How It Works

```
narration.txt + slides/ → s2v build → video.mp4
```

1. **Write your script** — one paragraph per slide in `narration.txt`
2. **Add your slides** — PNGs, PowerPoint, or Google Slides
3. **Run `s2v build`** — TTS narration, transitions, annotations, done

## Example Projects

### Product Tour
A 7-slide product walkthrough with callout annotations and the default British male voice.

**Voice:** en-GB-RyanNeural | **Transition:** fade | **Duration:** ~2 min

```yaml
# demo.yaml
voice: en-GB-RyanNeural
transition: fade
callouts: callouts.json
```

```bash
s2v build examples/product-tour
```

---

### Employee Onboarding
A 7-slide onboarding guide with an American female voice and wipe transitions.

**Voice:** en-US-JennyNeural | **Transition:** wipeleft | **Duration:** ~3 min

```yaml
# demo.yaml
voice: en-US-JennyNeural
transition: wipeleft
transition_duration: 0.5
```

```bash
s2v build examples/onboarding-video
```

---

### Release Notes
A 6-slide release announcement with an American male voice and dissolve transitions. Includes custom QA rules to catch "TODO" and "FIXME" in narration.

**Voice:** en-US-GuyNeural | **Transition:** dissolve | **Duration:** ~2.5 min

```yaml
# demo.yaml
voice: en-US-GuyNeural
transition: dissolve
qa_rules:
  forbidden_words: ["TODO", "FIXME", "WIP"]
```

```bash
s2v build examples/release-notes
```

---

### PowerPoint Import
Shows how to build a video directly from a `.pptx` file — no manual slide export needed.

```yaml
# demo.yaml
slides_source: pptx
slides_file: presentation.pptx
voice: en-GB-SoniaNeural
transition: smoothleft
```

```bash
# Place your .pptx file in the directory, then:
s2v build examples/pptx-import
```

---

### Google Slides Import
Pull slides directly from a Google Slides presentation via the API.

```yaml
# demo.yaml
slides_source: google-slides
slides_id: 1BxiM...  # your presentation ID
voice: en-US-AriaNeural
```

```bash
export GOOGLE_SLIDES_API_KEY=your-key-here
s2v build examples/google-slides-import
```

## Voice Samples

Run `s2v voices` to browse all 400+ available voices. Here are the recommended ones:

| Voice | Gender | Language | Best For |
|-------|--------|----------|----------|
| en-GB-RyanNeural | Male | English (UK) | Professional demos, product tours |
| en-GB-SoniaNeural | Female | English (UK) | Presentations, executive briefings |
| en-US-GuyNeural | Male | English (US) | Casual walkthroughs, tutorials |
| en-US-JennyNeural | Female | English (US) | Training videos, onboarding |
| en-US-AriaNeural | Female | English (US) | Marketing videos, announcements |
| en-US-DavisNeural | Male | English (US) | Technical deep-dives |
| fr-FR-HenriNeural | Male | French | French-language content |
| de-DE-ConradNeural | Male | German | German-language content |
| es-ES-AlvaroNeural | Male | Spanish | Spanish-language content |
| ja-JP-KeitaNeural | Male | Japanese | Japanese-language content |

## Transition Gallery

Run `s2v transitions` to see all 45+ transitions. Popular choices:

| Transition | Effect | Best For |
|-----------|--------|----------|
| `fade` | Classic cross-fade | Default, works everywhere |
| `dissolve` | Gradual pixel dissolve | Subtle, professional |
| `wipeleft` | Wipe from right to left | Sequential content |
| `smoothleft` | Smooth push left | Modern presentations |
| `circleopen` | Iris reveal from centre | Dramatic reveals |
| `fadeblack` | Fade through black | Scene changes |
| `zoomin` | Zoom into next slide | Focus transitions |
| `radial` | Clock-wipe effect | Creative presentations |

## Quick Start

```bash
# Install
npm install -g script-to-video

# Scaffold a new project
s2v init my-video

# Add your slides to my-video/slides/
# Edit my-video/narration.txt

# Build
s2v build my-video

# Output: my-video/output/my-video.mp4
```
