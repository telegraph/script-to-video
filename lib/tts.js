/**
 * TTS audio generation — converts text chunks to WAV audio files using Edge TTS.
 *
 * Requires: edge-tts CLI (pip install edge-tts) and ffmpeg.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Check that edge-tts and ffmpeg are available.
 */
function checkDeps() {
  try {
    execSync('edge-tts --version', { stdio: 'pipe' });
  } catch {
    throw new Error(
      'edge-tts not found. Install it with: pip install edge-tts'
    );
  }
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
  } catch {
    throw new Error(
      'ffmpeg not found. Install it from https://ffmpeg.org or via your package manager.'
    );
  }
}

/**
 * Generate TTS audio for a single chunk.
 * Returns the path to the generated WAV file.
 */
function generateChunkAudio(txtPath, wavPath, config) {
  const mp3Path = wavPath.replace(/\.wav$/, '.mp3');

  execSync(
    `edge-tts ` +
    `--voice "${config.voice}" ` +
    `--rate="${config.rate}" ` +
    `--pitch="${config.pitch}" ` +
    `--file "${txtPath}" ` +
    `--write-media "${mp3Path}"`,
    { stdio: 'pipe' }
  );

  execSync(
    `ffmpeg -y -i "${mp3Path}" -ar ${config.audio_sample_rate} -ac 1 "${wavPath}"`,
    { stdio: 'pipe' }
  );

  return wavPath;
}

/**
 * Generate TTS audio for all chunks in the chunks directory.
 * Skips chunks where the WAV is newer than the text file (caching).
 */
function generateAllAudio(config) {
  checkDeps();

  const chunksDir = config.chunksDir;
  const txtFiles = fs.readdirSync(chunksDir)
    .filter(f => /^p\d+\.txt$/.test(f))
    .sort();

  let generated = 0;
  let cached = 0;

  for (const txtFile of txtFiles) {
    const base = path.basename(txtFile, '.txt');
    const txtPath = path.join(chunksDir, txtFile);
    const wavPath = path.join(chunksDir, `${base}.wav`);

    // Cache: skip if WAV exists and is newer than text
    if (fs.existsSync(wavPath) && fs.statSync(wavPath).mtimeMs > fs.statSync(txtPath).mtimeMs) {
      console.log(chalk.dim(`  ~ ${base} (cached)`));
      cached++;
      continue;
    }

    generateChunkAudio(txtPath, wavPath, config);
    console.log(chalk.green(`  + ${base}`));
    generated++;
  }

  // Generate tail silence
  const tailPath = path.join(chunksDir, 'tail-silence.wav');
  execSync(
    `ffmpeg -y -f lavfi -i anullsrc=r=${config.audio_sample_rate}:cl=mono ` +
    `-t ${config.tail_silence} -c:a pcm_s16le "${tailPath}"`,
    { stdio: 'pipe' }
  );

  console.log(chalk.green(`  ${generated} generated, ${cached} cached`));
  return txtFiles.length;
}

module.exports = { generateAllAudio, generateChunkAudio, checkDeps };
