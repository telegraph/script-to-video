/**
 * Subtitle generator — creates .srt and .vtt files from narration chunks
 * synced to slide-timings.json.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadConfig } = require('./config');

/**
 * Format seconds as HH:MM:SS,mmm (SRT format).
 */
function formatSrt(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Format seconds as HH:MM:SS.mmm (VTT format).
 */
function formatVtt(seconds) {
  return formatSrt(seconds).replace(',', '.');
}

/**
 * Generate subtitle files from narration + timings.
 */
async function subtitles(dir, cliOpts = {}) {
  const config = loadConfig(dir, cliOpts);
  const format = cliOpts.format || 'both';

  const timingsPath = path.join(config.outputDir, 'slide-timings.json');
  if (!fs.existsSync(timingsPath)) {
    throw new Error('slide-timings.json not found. Run the build or narrate step first.');
  }
  if (!fs.existsSync(config.narrationPath)) {
    throw new Error('narration.txt not found.');
  }

  const timings = JSON.parse(fs.readFileSync(timingsPath, 'utf-8'));
  const narration = fs.readFileSync(config.narrationPath, 'utf-8');
  const chunks = narration.trim().split(/\n\n+/).filter(p => p.trim());

  if (chunks.length !== timings.length) {
    console.log(chalk.yellow(`  Warning: ${chunks.length} narration chunks vs ${timings.length} timings`));
  }

  // Build subtitle entries
  const entries = [];
  let offset = 0;

  for (let i = 0; i < Math.min(chunks.length, timings.length); i++) {
    const start = offset;
    const end = offset + timings[i].audio_duration;
    entries.push({ index: i + 1, start, end, text: chunks[i].trim() });
    offset = end;
  }

  // Generate SRT
  if (format === 'srt' || format === 'both') {
    const srtContent = entries.map(e =>
      `${e.index}\n${formatSrt(e.start)} --> ${formatSrt(e.end)}\n${e.text}\n`
    ).join('\n');

    const srtPath = path.join(config.outputDir, `${config.name}.srt`);
    fs.writeFileSync(srtPath, srtContent);
    console.log(chalk.green(`  + ${path.basename(srtPath)}`));
  }

  // Generate VTT
  if (format === 'vtt' || format === 'both') {
    const vttContent = 'WEBVTT\n\n' + entries.map(e =>
      `${e.index}\n${formatVtt(e.start)} --> ${formatVtt(e.end)}\n${e.text}\n`
    ).join('\n');

    const vttPath = path.join(config.outputDir, `${config.name}.vtt`);
    fs.writeFileSync(vttPath, vttContent);
    console.log(chalk.green(`  + ${path.basename(vttPath)}`));
  }

  console.log(chalk.green(`  ${entries.length} subtitle entries generated`));
}

module.exports = { subtitles, formatSrt, formatVtt };
