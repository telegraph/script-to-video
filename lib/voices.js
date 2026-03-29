/**
 * Voice browser — lists available Edge TTS voices with filtering by language
 * and gender. Includes curated recommendations with sample text previews.
 */

const { execSync } = require('child_process');
const chalk = require('chalk');

/**
 * Curated voice recommendations with sample descriptions.
 * These are the best voices for narration based on quality and naturalness.
 */
const RECOMMENDED = {
  'en-GB-RyanNeural':       { gender: 'Male',   lang: 'English (UK)',     note: 'Natural British male — great for professional demos (default)' },
  'en-GB-SoniaNeural':      { gender: 'Female', lang: 'English (UK)',     note: 'Clear British female — warm, authoritative tone' },
  'en-US-GuyNeural':        { gender: 'Male',   lang: 'English (US)',     note: 'Friendly American male — casual, approachable' },
  'en-US-JennyNeural':      { gender: 'Female', lang: 'English (US)',     note: 'American female — clear, professional' },
  'en-US-AriaNeural':       { gender: 'Female', lang: 'English (US)',     note: 'American female — expressive, engaging' },
  'en-US-DavisNeural':      { gender: 'Male',   lang: 'English (US)',     note: 'American male — calm, measured delivery' },
  'en-AU-WilliamNeural':    { gender: 'Male',   lang: 'English (AU)',     note: 'Australian male — relaxed, friendly' },
  'en-AU-NatashaNeural':    { gender: 'Female', lang: 'English (AU)',     note: 'Australian female — bright, clear' },
  'en-IN-PrabhatNeural':    { gender: 'Male',   lang: 'English (India)',  note: 'Indian English male — clear articulation' },
  'en-IN-NeerjaNeural':     { gender: 'Female', lang: 'English (India)',  note: 'Indian English female — warm, professional' },
};

/**
 * List available voices, optionally filtered by language and gender.
 */
async function listVoices(opts = {}) {
  const { lang, gender, json } = opts;

  // Show recommended voices first
  if (!json) {
    console.log(chalk.bold('\n  Recommended voices for narration\n'));

    let filtered = Object.entries(RECOMMENDED);
    if (lang) {
      filtered = filtered.filter(([name]) =>
        name.toLowerCase().startsWith(lang.toLowerCase() + '-') ||
        name.toLowerCase().includes(`-${lang.toLowerCase()}`)
      );
    }
    if (gender) {
      filtered = filtered.filter(([, v]) =>
        v.gender.toLowerCase() === gender.toLowerCase()
      );
    }

    if (filtered.length === 0) {
      console.log(chalk.yellow('  No recommended voices match your filter.\n'));
    } else {
      for (const [name, v] of filtered) {
        const def = name === 'en-GB-RyanNeural' ? chalk.dim(' ← default') : '';
        console.log(`  ${chalk.green(name.padEnd(28))} ${chalk.dim(v.gender.padEnd(8))} ${v.lang.padEnd(22)} ${v.note}${def}`);
      }
    }

    console.log(chalk.bold('\n  Voice tuning options\n'));
    console.log('  --rate     Speech rate:  "-10%" (slower) to "+20%" (faster)');
    console.log('  --pitch    Pitch shift:  "-4Hz" (deeper) to "+4Hz" (higher)\n');
    console.log(chalk.dim('  Example: s2v build --voice en-US-GuyNeural --rate "-3%" --pitch "+1Hz"\n'));
    console.log(chalk.dim('  Or in demo.yaml:'));
    console.log(chalk.dim('    voice: en-US-GuyNeural'));
    console.log(chalk.dim('    rate: "-3%"'));
    console.log(chalk.dim('    pitch: "+1Hz"\n'));
  }

  // Try to get full list from edge-tts
  console.log(chalk.bold('  All available voices'));
  console.log(chalk.dim('  (requires edge-tts installed: pip install edge-tts)\n'));

  try {
    const raw = execSync('edge-tts --list-voices', { encoding: 'utf-8', timeout: 15000 });
    const lines = raw.trim().split('\n');

    // Parse voice list
    const voices = [];
    let current = {};
    for (const line of lines) {
      if (line.startsWith('Name: ')) {
        if (current.name) voices.push(current);
        current = { name: line.replace('Name: ', '').trim() };
      } else if (line.startsWith('Gender: ')) {
        current.gender = line.replace('Gender: ', '').trim();
      }
    }
    if (current.name) voices.push(current);

    // Filter
    let filtered = voices;
    if (lang) {
      filtered = filtered.filter(v =>
        v.name.toLowerCase().startsWith(lang.toLowerCase() + '-')
      );
    }
    if (gender) {
      filtered = filtered.filter(v =>
        v.gender && v.gender.toLowerCase() === gender.toLowerCase()
      );
    }

    if (json) {
      console.log(JSON.stringify(filtered, null, 2));
    } else {
      console.log(chalk.dim(`  ${filtered.length} voices found${lang ? ` for "${lang}"` : ''}${gender ? ` (${gender})` : ''}\n`));
      for (const v of filtered) {
        const isRecommended = RECOMMENDED[v.name] ? chalk.yellow(' ★') : '';
        console.log(`  ${chalk.dim(v.name.padEnd(32))} ${(v.gender || '').padEnd(8)}${isRecommended}`);
      }
      console.log();
    }
  } catch {
    console.log(chalk.yellow('  edge-tts not installed — showing recommended voices only.'));
    console.log(chalk.dim('  Install with: pip install edge-tts\n'));

    if (json) {
      console.log(JSON.stringify(RECOMMENDED, null, 2));
    }
  }
}

/**
 * Generate a voice sample — creates a short audio clip with the given voice.
 * Useful for previewing voices before committing to one.
 */
async function generateSample(voiceName, outputPath, opts = {}) {
  const rate = opts.rate || '-5%';
  const pitch = opts.pitch || '-2Hz';
  const sampleText = opts.text || 'This is a sample of the voice you selected for your video narration. It demonstrates the tone, pace, and clarity you can expect in your final video.';

  try {
    execSync(
      `edge-tts --voice "${voiceName}" --rate="${rate}" --pitch="${pitch}" ` +
      `--text "${sampleText}" --write-media "${outputPath}"`,
      { stdio: 'pipe' }
    );
    return outputPath;
  } catch (err) {
    throw new Error(`Failed to generate sample for ${voiceName}: ${err.message}`);
  }
}

module.exports = { listVoices, generateSample, RECOMMENDED };
