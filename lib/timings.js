/**
 * Timing calculator — uses ffprobe to measure each audio chunk's duration
 * and writes slide-timings.json for the FFmpeg build step.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Get the duration of a WAV file in seconds using ffprobe.
 */
function getAudioDuration(filePath) {
  const raw = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
    { encoding: 'utf-8' }
  ).trim();
  return parseFloat(raw);
}

/**
 * Calculate timings for all slides based on audio chunk durations.
 * Each slide's display duration = audio duration + transition overlap + tail buffer (last slide).
 */
function calculateTimings(config) {
  const chunksDir = config.chunksDir;
  const xfade = config.transition_duration;
  const tailBuffer = config.tail_silence;

  const chunks = fs.readdirSync(chunksDir)
    .filter(f => /^p\d+\.wav$/.test(f))
    .sort();

  const timings = chunks.map((file, i) => {
    const audio = getAudioDuration(path.join(chunksDir, file));
    const isLast = i === chunks.length - 1;
    return {
      slide: i,
      chunk: file,
      audio_duration: audio,
      slide_duration: audio + xfade + (isLast ? tailBuffer : 0),
    };
  });

  const timingsPath = path.join(config.outputDir, 'slide-timings.json');
  fs.writeFileSync(timingsPath, JSON.stringify(timings, null, 2));

  const total = timings.reduce((s, t) => s + t.audio_duration, 0);
  const mins = Math.floor(total / 60);
  const secs = Math.round(total % 60);
  console.log(chalk.green(`  ${timings.length} slides, total narration: ${mins}m ${secs}s`));

  return timings;
}

module.exports = { calculateTimings, getAudioDuration };
