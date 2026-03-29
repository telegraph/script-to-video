#!/usr/bin/env node

/**
 * s2v — CLI for building narrated videos from a script + slides.
 *
 * Slides can come from a directory of PNGs, a PowerPoint file, or Google Slides.
 * Narration is generated via Edge TTS from a plain-text script.
 *
 * Usage:
 *   s2v build [dir]                   Full pipeline: import → TTS → annotate → render
 *   s2v import [dir]                  Import slides from PPTX / Google Slides → PNGs
 *   s2v narrate [dir]                 Generate TTS audio from narration.txt
 *   s2v qa [dir]                      Run QA validation checks
 *   s2v voices [--lang <code>]        List available Edge TTS voices
 *   s2v init [name]                   Scaffold a new project directory
 *   s2v thumbnail [dir]               Extract poster frame from slide 1
 *   s2v subtitles [dir]               Generate .srt/.vtt from narration
 *   s2v transitions                   List available xfade transition types
 */

const { Command } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');

const program = new Command();

program
  .name('s2v')
  .description('Turn a narration script + slides into a polished narrated video')
  .version(pkg.version);

// ── build ────────────────────────────────────────────────────────────────────

program
  .command('build [dir]')
  .description('Build video (full pipeline: import → TTS → annotate → render)')
  .option('-c, --config <path>', 'Path to demo.yaml', 'demo.yaml')
  .option('-v, --voice <name>', 'Edge TTS voice override')
  .option('-r, --rate <rate>', 'Speech rate adjustment (e.g. "-5%")')
  .option('-p, --pitch <pitch>', 'Pitch adjustment (e.g. "-2Hz")')
  .option('--resolution <WxH>', 'Video resolution (e.g. "1920x1080")')
  .option('-t, --transition <type>', 'xfade transition type (e.g. "fade", "wipeleft")')
  .option('--transition-duration <seconds>', 'Transition duration in seconds', parseFloat)
  .option('--crf <number>', 'Video quality 0–51 (lower = better)', parseInt)
  .option('--skip-import', 'Skip slide import, use existing PNGs')
  .option('--skip-qa', 'Skip QA validation before build')
  .option('--subtitles', 'Generate .srt/.vtt alongside video')
  .option('--thumbnail', 'Extract poster frame from slide 1')
  .option('-o, --output <path>', 'Output file path')
  .option('-w, --watch', 'Watch for changes and rebuild automatically')
  .action(async (dir, opts) => {
    const { build } = require('../lib/build');
    await build(dir, opts);
  });

// ── import ───────────────────────────────────────────────────────────────────

program
  .command('import [dir]')
  .description('Import slides from PowerPoint (.pptx) or Google Slides → PNGs')
  .option('-c, --config <path>', 'Path to demo.yaml', 'demo.yaml')
  .option('--resolution <WxH>', 'Export resolution (e.g. "1920x1080")')
  .action(async (dir, opts) => {
    const { importSlides } = require('../lib/import-slides');
    await importSlides(dir, opts);
  });

// ── narrate ──────────────────────────────────────────────────────────────────

program
  .command('narrate [dir]')
  .description('Generate TTS audio from narration.txt')
  .option('-c, --config <path>', 'Path to demo.yaml', 'demo.yaml')
  .option('-v, --voice <name>', 'Edge TTS voice override')
  .option('-r, --rate <rate>', 'Speech rate adjustment')
  .option('-p, --pitch <pitch>', 'Pitch adjustment')
  .action(async (dir, opts) => {
    const { narrate } = require('../lib/narrate');
    await narrate(dir, opts);
  });

// ── qa ───────────────────────────────────────────────────────────────────────

program
  .command('qa [dir]')
  .description('Run QA validation checks on slides, narration, and output')
  .option('-c, --config <path>', 'Path to demo.yaml', 'demo.yaml')
  .option('--internal', 'Enable internal-language checks (flag "your" usage)')
  .option('--strict', 'Treat warnings as failures')
  .option('--custom-rules <path>', 'Path to custom QA rules JSON')
  .action(async (dir, opts) => {
    const { qa } = require('../lib/qa');
    await qa(dir, opts);
  });

// ── voices ───────────────────────────────────────────────────────────────────

program
  .command('voices')
  .description('List available Edge TTS voices')
  .option('--lang <code>', 'Filter by language code (e.g. "en", "fr", "de")')
  .option('--gender <gender>', 'Filter by gender (Male/Female)')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { listVoices } = require('../lib/voices');
    await listVoices(opts);
  });

// ── init ─────────────────────────────────────────────────────────────────────

program
  .command('init [name]')
  .description('Scaffold a new project directory with template files')
  .option('--voice <name>', 'Default voice for demo.yaml')
  .option('--resolution <WxH>', 'Default resolution', '1680x1050')
  .option('--source <type>', 'Slide source: directory, pptx, google-slides', 'directory')
  .action(async (name, opts) => {
    const { init } = require('../lib/init');
    await init(name, opts);
  });

// ── thumbnail ────────────────────────────────────────────────────────────────

program
  .command('thumbnail [dir]')
  .description('Extract poster frame / thumbnail from slide 1')
  .option('-c, --config <path>', 'Path to demo.yaml', 'demo.yaml')
  .option('-o, --output <path>', 'Output thumbnail path')
  .option('--width <number>', 'Thumbnail width in pixels', parseInt)
  .action(async (dir, opts) => {
    const { thumbnail } = require('../lib/thumbnail');
    await thumbnail(dir, opts);
  });

// ── subtitles ────────────────────────────────────────────────────────────────

program
  .command('subtitles [dir]')
  .description('Generate .srt and .vtt subtitle files from narration + timings')
  .option('-c, --config <path>', 'Path to demo.yaml', 'demo.yaml')
  .option('--format <type>', 'Output format: srt, vtt, or both', 'both')
  .action(async (dir, opts) => {
    const { subtitles } = require('../lib/subtitles');
    await subtitles(dir, opts);
  });

// ── transitions ──────────────────────────────────────────────────────────────

program
  .command('transitions')
  .description('List all available FFmpeg xfade transition types with descriptions')
  .action(() => {
    const { listTransitions } = require('../lib/transitions');
    listTransitions();
  });

program.parse();
