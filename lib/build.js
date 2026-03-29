/**
 * Main build orchestrator — runs the full pipeline:
 *   1. Import slides (from directory, PPTX, or Google Slides)
 *   2. Preprocess narration into chunks
 *   3. Generate TTS audio per chunk
 *   4. Calculate slide timings from audio durations
 *   5. Annotate slides with callouts (if callouts.json exists)
 *   6. Generate and run FFmpeg build command
 *   7. Optionally generate subtitles and thumbnail
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadConfig } = require('./config');
const { preprocess } = require('./preprocess');
const { generateAllAudio, checkDeps } = require('./tts');
const { calculateTimings } = require('./timings');
const { annotateSlides } = require('./annotate');
const { generateFfmpegScript } = require('./ffmpeg-builder');
const { importSlides } = require('./import-slides');
const { qa } = require('./qa');

async function build(dir, cliOpts = {}) {
  const config = loadConfig(dir, cliOpts);

  console.log(chalk.bold('\n═══════════════════════════════════════════════'));
  console.log(chalk.bold(`  script-to-video: ${config.name}`));
  console.log(chalk.bold('═══════════════════════════════════════════════\n'));

  // Ensure output directory exists
  fs.mkdirSync(config.outputDir, { recursive: true });
  fs.mkdirSync(config.chunksDir, { recursive: true });

  // ── Step 1: Import slides ────────────────────────────────────────────────

  if (!cliOpts.skipImport) {
    console.log(chalk.bold('Step 1 — Importing slides…'));
    await importSlides(dir, cliOpts);
  } else {
    console.log(chalk.dim('Step 1 — Skipped (--skip-import)'));
  }

  // Verify slides exist
  if (!fs.existsSync(config.slidesDir) ||
      fs.readdirSync(config.slidesDir).filter(f => f.endsWith('.png')).length === 0) {
    console.log(chalk.red('\n  No slides found. Import or add PNGs to slides/ first.\n'));
    process.exit(1);
  }

  // ── Step 2: Preprocess narration ─────────────────────────────────────────

  console.log(chalk.bold('\nStep 2 — Preprocessing narration…'));
  if (!fs.existsSync(config.narrationPath)) {
    console.log(chalk.red(`\n  narration.txt not found at ${config.narrationPath}\n`));
    process.exit(1);
  }
  const chunks = preprocess(config);

  // ── Step 3: Generate TTS audio ───────────────────────────────────────────

  console.log(chalk.bold('\nStep 3 — Generating TTS audio…'));
  console.log(chalk.dim(`  Voice: ${config.voice} | Rate: ${config.rate} | Pitch: ${config.pitch}`));
  generateAllAudio(config);

  // ── Step 4: Calculate timings ────────────────────────────────────────────

  console.log(chalk.bold('\nStep 4 — Calculating slide timings…'));
  calculateTimings(config);

  // ── Step 5: Annotate slides ──────────────────────────────────────────────

  console.log(chalk.bold('\nStep 5 — Annotating slides…'));
  await annotateSlides(config);

  // ── Step 6: QA validation ────────────────────────────────────────────────

  if (!cliOpts.skipQa) {
    console.log(chalk.bold('\nStep 6 — Running QA checks…'));
    const passed = await qa(dir, { ...cliOpts, config: cliOpts.config });
    if (!passed) {
      console.log(chalk.yellow('\n  QA checks failed. Use --skip-qa to build anyway.\n'));
      process.exit(1);
    }
  } else {
    console.log(chalk.dim('\nStep 6 — Skipped (--skip-qa)'));
  }

  // ── Step 7: Generate and run FFmpeg ──────────────────────────────────────

  console.log(chalk.bold('\nStep 7 — Assembling video…'));
  const scriptPath = generateFfmpegScript(config);
  execSync(`bash "${scriptPath}"`, { stdio: 'inherit' });

  // ── Step 8: Extras ───────────────────────────────────────────────────────

  if (cliOpts.subtitles) {
    console.log(chalk.bold('\nStep 8a — Generating subtitles…'));
    const { subtitles } = require('./subtitles');
    await subtitles(dir, cliOpts);
  }

  if (cliOpts.thumbnail) {
    console.log(chalk.bold('\nStep 8b — Generating thumbnail…'));
    const { thumbnail } = require('./thumbnail');
    await thumbnail(dir, cliOpts);
  }

  // ── Done ─────────────────────────────────────────────────────────────────

  const stat = fs.statSync(config.outputPath);
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);

  console.log(chalk.bold('\n═══════════════════════════════════════════════'));
  console.log(chalk.green(`  ✓ Done: ${config.outputPath}`));
  console.log(chalk.green(`  Size: ${sizeMB} MB`));
  console.log(chalk.bold('═══════════════════════════════════════════════\n'));

  // ── Watch mode ───────────────────────────────────────────────────────────

  if (cliOpts.watch) {
    console.log(chalk.blue('  Watching for changes… (Ctrl+C to stop)\n'));
    const chokidar = require('chokidar');

    const watchPaths = [
      config.narrationPath,
      config.calloutsPath,
      config.sourceDir || config.slidesDir,
    ].filter(p => fs.existsSync(p));

    let rebuilding = false;
    const watcher = chokidar.watch(watchPaths, { ignoreInitial: true });

    watcher.on('change', async (changedPath) => {
      if (rebuilding) return;
      rebuilding = true;
      console.log(chalk.blue(`\n  Changed: ${path.relative(config.projectDir, changedPath)}`));
      console.log(chalk.blue('  Rebuilding…\n'));
      try {
        await build(dir, { ...cliOpts, watch: false });
      } catch (err) {
        console.log(chalk.red(`  Rebuild failed: ${err.message}`));
      }
      rebuilding = false;
    });
  }
}

module.exports = { build };
