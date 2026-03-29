# Agent Integration Guide

Use `script-to-video` from any AI coding agent without cloning this repo.

## Option 1: npx (no install)

Every command works via `npx` — the package is fetched on demand:

```bash
npx s2v init my-video
npx s2v build my-video
npx s2v voices
```

## Option 2: Add the skill to your repo

Copy the skill definition into your project so your AI agent knows how to use it:

```bash
# From your project root
mkdir -p .github/skills/video
curl -sL https://raw.githubusercontent.com/telegraph/script-to-video/main/.github/skills/video/SKILL.md \
  > .github/skills/video/SKILL.md
```

Then reference it in your agent config:

### Claude Code (CLAUDE.md)

Add to your `CLAUDE.md`:

```markdown
## Video Generation

For creating demo/walkthrough videos, use the script-to-video skill.
See `.github/skills/video/SKILL.md` for full usage.

Quick: `npx s2v init <name>` → edit narration.txt → add slides → `npx s2v build <name>`
```

### GitHub Copilot (.github/copilot-instructions.md)

Add to your copilot instructions:

```markdown
## Video Generation

When asked to create demo videos, use `npx s2v` (script-to-video package).
See `.github/skills/video/SKILL.md` for commands, voices, transitions, and options.
```

### Cursor / Cody / Other agents (AGENTS.md)

Add to your `AGENTS.md`:

```markdown
## Video Generation Skill

This project can generate narrated demo videos using script-to-video.
See `.github/skills/video/SKILL.md` for the full skill definition.
All commands use `npx s2v` — no repo checkout needed.
```

## Option 3: One-liner in agent instructions

If you don't want to copy the skill file, add this to your agent config:

```markdown
For video generation: use `npx s2v`. Run `npx s2v --help` for commands.
Key flow: `npx s2v init <name>` → write narration.txt (1 paragraph per slide)
→ add PNGs to slides/ → `npx s2v build <name>`.
Voices: `npx s2v voices`. Transitions: `npx s2v transitions`.
Music: `npx s2v music` or `--music ambient`.
```

## Prerequisites

The agent's environment needs:

```bash
# Check
which node && which ffmpeg && which edge-tts

# Install if missing
pip install edge-tts
brew install ffmpeg  # or apt install ffmpeg
```

## Example: agent creates a video

An agent receiving "create a demo video for our new search feature" would:

```bash
# 1. Scaffold
npx s2v init search-demo

# 2. Write narration
cat > search-demo/narration.txt << 'EOF'
Search Feature Demo. A walkthrough of the new fuzzy search experience.

The search bar now supports fuzzy matching. Type any keyword and results appear instantly.

Results include preview snippets so you can find content without clicking through pages.

That is the new search. Fuzzy matching, instant results, and inline previews.
EOF

# 3. User provides slides (the agent can't generate real screenshots)
echo "Please add your screenshots to search-demo/slides/ as slide-00.png through slide-03.png"

# 4. Configure
cat > search-demo/demo.yaml << 'EOF'
name: search-demo
voice: en-US-JennyNeural
transition: smoothleft
music: ambient
music_volume: 0.12
EOF

# 5. Build (once slides are in place)
npx s2v build search-demo
```
