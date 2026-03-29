/**
 * Background music generator — creates royalty-free background tracks
 * using FFmpeg's audio synthesis filters. No external files needed.
 *
 * Available presets:
 *   - ambient      Soft, warm pad — ideal for professional demos
 *   - upbeat       Bright, rhythmic pulse — good for product launches
 *   - corporate    Clean, neutral tone — safe for any corporate video
 *   - lofi         Warm, mellow vibe — casual walkthroughs
 *   - minimal      Very subtle drone — barely-there background texture
 *   - calm         Gentle, slow-moving pad — onboarding, training
 *
 * All tracks are generated at build time and cached in output/music/.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadConfig } = require('./config');

const PRESETS = {
  ambient: {
    name: 'Ambient Pad',
    description: 'Soft, warm synthesiser pad — ideal for professional demos and walkthroughs',
    // Two detuned sine waves with reverb-like filtering for warmth
    filter: [
      'sine=frequency=220:duration=180,volume=0.3',
      'sine=frequency=330:duration=180,volume=0.2',
    ].join(';'),
    build: (outPath, duration) => {
      execSync(
        `ffmpeg -y ` +
        `-f lavfi -i "sine=frequency=220:sample_rate=44100:duration=${duration}" ` +
        `-f lavfi -i "sine=frequency=329.63:sample_rate=44100:duration=${duration}" ` +
        `-f lavfi -i "sine=frequency=440:sample_rate=44100:duration=${duration}" ` +
        `-filter_complex "` +
        `[0:a]volume=0.25[a1];` +
        `[1:a]volume=0.18[a2];` +
        `[2:a]volume=0.12[a3];` +
        `[a1][a2][a3]amix=inputs=3:normalize=0,` +
        `lowpass=f=800,` +
        `afade=t=in:d=3,afade=t=out:st=${duration - 3}:d=3` +
        `[out]" -map "[out]" -c:a pcm_s16le -ar 44100 "${outPath}"`,
        { stdio: 'pipe' }
      );
    },
  },

  upbeat: {
    name: 'Upbeat Pulse',
    description: 'Bright, rhythmic energy — great for product launches and announcements',
    build: (outPath, duration) => {
      // Rhythmic pulse using amplitude modulation
      execSync(
        `ffmpeg -y ` +
        `-f lavfi -i "sine=frequency=293.66:sample_rate=44100:duration=${duration}" ` +
        `-f lavfi -i "sine=frequency=369.99:sample_rate=44100:duration=${duration}" ` +
        `-f lavfi -i "sine=frequency=4:sample_rate=44100:duration=${duration}" ` +
        `-filter_complex "` +
        `[0:a]volume=0.3[bass];` +
        `[1:a]volume=0.2[mid];` +
        `[2:a]volume=0.5,aformat=sample_fmts=flt[lfo];` +
        `[bass][lfo]amultiply[pulse];` +
        `[pulse][mid]amix=inputs=2:normalize=0,` +
        `lowpass=f=1200,` +
        `afade=t=in:d=2,afade=t=out:st=${duration - 2}:d=2` +
        `[out]" -map "[out]" -c:a pcm_s16le -ar 44100 "${outPath}"`,
        { stdio: 'pipe' }
      );
    },
  },

  corporate: {
    name: 'Corporate Clean',
    description: 'Neutral, professional tone — safe for any corporate or internal video',
    build: (outPath, duration) => {
      execSync(
        `ffmpeg -y ` +
        `-f lavfi -i "sine=frequency=261.63:sample_rate=44100:duration=${duration}" ` +
        `-f lavfi -i "sine=frequency=392:sample_rate=44100:duration=${duration}" ` +
        `-filter_complex "` +
        `[0:a]volume=0.2[a1];` +
        `[1:a]volume=0.15[a2];` +
        `[a1][a2]amix=inputs=2:normalize=0,` +
        `lowpass=f=600,highpass=f=100,` +
        `afade=t=in:d=4,afade=t=out:st=${duration - 4}:d=4` +
        `[out]" -map "[out]" -c:a pcm_s16le -ar 44100 "${outPath}"`,
        { stdio: 'pipe' }
      );
    },
  },

  lofi: {
    name: 'Lo-fi Warm',
    description: 'Warm, mellow vibe with gentle movement — casual tutorials and walkthroughs',
    build: (outPath, duration) => {
      execSync(
        `ffmpeg -y ` +
        `-f lavfi -i "sine=frequency=196:sample_rate=44100:duration=${duration}" ` +
        `-f lavfi -i "sine=frequency=261.63:sample_rate=44100:duration=${duration}" ` +
        `-f lavfi -i "sine=frequency=0.5:sample_rate=44100:duration=${duration}" ` +
        `-filter_complex "` +
        `[0:a]volume=0.25[bass];` +
        `[1:a]volume=0.15[tone];` +
        `[2:a]volume=0.3,aformat=sample_fmts=flt[wobble];` +
        `[tone][wobble]amultiply[warped];` +
        `[bass][warped]amix=inputs=2:normalize=0,` +
        `lowpass=f=500,` +
        `afade=t=in:d=3,afade=t=out:st=${duration - 3}:d=3` +
        `[out]" -map "[out]" -c:a pcm_s16le -ar 44100 "${outPath}"`,
        { stdio: 'pipe' }
      );
    },
  },

  minimal: {
    name: 'Minimal Drone',
    description: 'Very subtle background texture — barely audible, for when you want just a hint of atmosphere',
    build: (outPath, duration) => {
      execSync(
        `ffmpeg -y ` +
        `-f lavfi -i "sine=frequency=110:sample_rate=44100:duration=${duration}" ` +
        `-filter_complex "` +
        `[0:a]volume=0.15,` +
        `lowpass=f=300,` +
        `afade=t=in:d=5,afade=t=out:st=${duration - 5}:d=5` +
        `[out]" -map "[out]" -c:a pcm_s16le -ar 44100 "${outPath}"`,
        { stdio: 'pipe' }
      );
    },
  },

  calm: {
    name: 'Calm Pad',
    description: 'Gentle, slow-moving pad — ideal for onboarding, training, and educational content',
    build: (outPath, duration) => {
      execSync(
        `ffmpeg -y ` +
        `-f lavfi -i "sine=frequency=174.61:sample_rate=44100:duration=${duration}" ` +
        `-f lavfi -i "sine=frequency=261.63:sample_rate=44100:duration=${duration}" ` +
        `-f lavfi -i "sine=frequency=349.23:sample_rate=44100:duration=${duration}" ` +
        `-filter_complex "` +
        `[0:a]volume=0.2[a1];` +
        `[1:a]volume=0.15[a2];` +
        `[2:a]volume=0.1[a3];` +
        `[a1][a2][a3]amix=inputs=3:normalize=0,` +
        `lowpass=f=500,highpass=f=80,` +
        `afade=t=in:d=5,afade=t=out:st=${duration - 5}:d=5` +
        `[out]" -map "[out]" -c:a pcm_s16le -ar 44100 "${outPath}"`,
        { stdio: 'pipe' }
      );
    },
  },
};

/**
 * Generate a background music track from a preset.
 */
function generateMusic(preset, outputPath, duration = 180) {
  if (!PRESETS[preset]) {
    throw new Error(`Unknown music preset: "${preset}". Available: ${Object.keys(PRESETS).join(', ')}`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  PRESETS[preset].build(outputPath, duration);

  const stat = fs.statSync(outputPath);
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
  console.log(chalk.green(`  + ${path.basename(outputPath)} (${preset}, ${duration}s, ${sizeMB} MB)`));

  return outputPath;
}

/**
 * List available music presets.
 */
function listMusic() {
  console.log(chalk.bold('\n  Built-in background music presets\n'));
  console.log(chalk.dim('  Generated using FFmpeg — no external files or licences needed.\n'));

  for (const [key, preset] of Object.entries(PRESETS)) {
    console.log(`  ${chalk.green(key.padEnd(16))} ${preset.name}`);
    console.log(`  ${' '.repeat(16)} ${chalk.dim(preset.description)}\n`);
  }

  console.log(chalk.bold('  Usage\n'));
  console.log(chalk.dim('  In demo.yaml:'));
  console.log(chalk.dim('    background_music: ambient       # preset name'));
  console.log(chalk.dim('    music_volume: 0.15              # 0.0–1.0\n'));
  console.log(chalk.dim('  Or via CLI:'));
  console.log(chalk.dim('    s2v build --music ambient --music-volume 0.2\n'));
  console.log(chalk.dim('  Or bring your own:'));
  console.log(chalk.dim('    s2v build --music ~/music/track.mp3\n'));
  console.log(chalk.dim('  Preview a preset:'));
  console.log(chalk.dim('    s2v music preview ambient'));
  console.log(chalk.dim('    s2v music preview upbeat --duration 10\n'));
}

/**
 * Preview a music preset by generating a short sample and playing it.
 */
function previewMusic(preset, opts = {}) {
  const duration = opts.duration || 15;
  const tmpPath = path.join(require('os').tmpdir(), `s2v-preview-${preset}.wav`);

  console.log(chalk.blue(`\n  Generating ${duration}s preview of "${preset}"…\n`));
  generateMusic(preset, tmpPath, duration);

  // Try to play the file
  const playCmd = process.platform === 'darwin' ? 'afplay' :
                  process.platform === 'win32' ? 'start' : 'aplay';

  try {
    console.log(chalk.dim(`  Playing with ${playCmd}… (Ctrl+C to stop)\n`));
    execSync(`${playCmd} "${tmpPath}"`, { stdio: 'inherit' });
  } catch {
    console.log(chalk.dim(`  Could not auto-play. File saved at: ${tmpPath}\n`));
  }
}

/**
 * CLI handler for the music command.
 */
async function music(action, preset, opts = {}) {
  if (!action || action === 'list') {
    listMusic();
  } else if (action === 'preview' && preset) {
    previewMusic(preset, opts);
  } else if (action === 'generate' && preset) {
    const outPath = opts.output || `${preset}.wav`;
    const duration = opts.duration || 180;
    generateMusic(preset, outPath, duration);
  } else {
    listMusic();
  }
}

module.exports = { music, generateMusic, listMusic, previewMusic, PRESETS };
