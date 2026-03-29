/**
 * Narrate command — preprocess narration text and generate TTS audio.
 * This is the standalone narration step (without full build).
 */

const chalk = require('chalk');
const { loadConfig } = require('./config');
const { preprocess } = require('./preprocess');
const { generateAllAudio } = require('./tts');

async function narrate(dir, cliOpts = {}) {
  const config = loadConfig(dir, cliOpts);

  console.log(chalk.bold('\n  Step 1 — Preprocessing narration…'));
  preprocess(config);

  console.log(chalk.bold('\n  Step 2 — Generating TTS audio…'));
  generateAllAudio(config);

  console.log(chalk.green('\n  Narration complete.\n'));
}

module.exports = { narrate };
