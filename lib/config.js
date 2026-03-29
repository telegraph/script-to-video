/**
 * Configuration loader — reads demo.yaml and merges with CLI overrides.
 *
 * Supports three slide sources:
 *   - "directory"      → folder of PNGs (default)
 *   - "pptx"           → PowerPoint file, converted to PNGs via LibreOffice
 *   - "google-slides"  → Google Slides deck, exported as PNGs via API
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DEFAULTS = {
  name: 'demo',
  resolution: [1680, 1050],
  voice: 'en-GB-RyanNeural',
  rate: '-5%',
  pitch: '-2Hz',
  transition: 'fade',
  transition_duration: 0.4,
  tail_silence: 3.0,
  crf: 20,
  preset: 'medium',
  fps: 25,
  audio_bitrate: '128k',
  audio_sample_rate: 44100,
  slides_source: 'directory',
  slides_dir: 'slides',
  slides_file: null,
  slides_id: null,
  narration: 'narration.txt',
  callouts: 'callouts.json',
  click_sound: null,
  background_music: null,       // path to background music file (mp3/wav)
  music_volume: 0.15,           // background music volume (0.0–1.0, relative to narration)
  qa_rules: {},
  preprocess: {
    colon_to_period: true,
    percent_to_word: true,
    ensure_trailing_period: true,
  },
};

/**
 * Resolve the project directory from a name or path.
 */
function resolveDir(dir) {
  if (!dir) return process.cwd();
  const asPath = path.resolve(dir);
  if (fs.existsSync(asPath) && fs.statSync(asPath).isDirectory()) return asPath;
  const asSub = path.join(process.cwd(), dir);
  if (fs.existsSync(asSub) && fs.statSync(asSub).isDirectory()) return asSub;
  return asPath;
}

/**
 * Load config from demo.yaml, merged with defaults and CLI overrides.
 */
function loadConfig(dir, cliOpts = {}) {
  const projectDir = resolveDir(dir);
  const configFile = cliOpts.config || 'demo.yaml';
  const configPath = path.join(projectDir, configFile);

  let fileConfig = {};
  if (fs.existsSync(configPath)) {
    fileConfig = yaml.load(fs.readFileSync(configPath, 'utf-8')) || {};
  }

  // Parse resolution
  let resolution = fileConfig.resolution || DEFAULTS.resolution;
  if (cliOpts.resolution) {
    const [w, h] = cliOpts.resolution.split('x').map(Number);
    resolution = [w, h];
  }
  if (typeof resolution === 'string') {
    const [w, h] = resolution.split('x').map(Number);
    resolution = [w, h];
  }

  const config = {
    ...DEFAULTS,
    ...fileConfig,
    resolution,
    projectDir,
    outputDir: path.join(projectDir, 'output'),
  };

  // CLI overrides
  if (cliOpts.voice) config.voice = cliOpts.voice;
  if (cliOpts.rate) config.rate = cliOpts.rate;
  if (cliOpts.pitch) config.pitch = cliOpts.pitch;
  if (cliOpts.transition) config.transition = cliOpts.transition;
  if (cliOpts.transitionDuration !== undefined) config.transition_duration = cliOpts.transitionDuration;
  if (cliOpts.crf !== undefined) config.crf = cliOpts.crf;
  if (cliOpts.output) config.outputPath = cliOpts.output;
  if (cliOpts.music) config.background_music = cliOpts.music;
  if (cliOpts.musicVolume !== undefined) config.music_volume = cliOpts.musicVolume;

  // Resolve paths
  config.narrationPath = path.join(projectDir, config.narration);
  config.calloutsPath = path.join(projectDir, config.callouts);
  config.slidesDir = path.join(config.outputDir, 'slides');
  config.annotatedDir = path.join(config.outputDir, 'slides-annotated');
  config.chunksDir = path.join(config.outputDir, 'chunks');

  // Source-specific paths
  if (config.slides_source === 'directory') {
    config.sourceDir = path.join(projectDir, config.slides_dir || 'slides');
  }
  if (config.slides_source === 'pptx' && config.slides_file) {
    config.pptxPath = path.join(projectDir, config.slides_file);
  }

  // Name fallback
  if (!config.name || config.name === 'demo') {
    config.name = path.basename(projectDir);
  }

  // Output path
  if (!config.outputPath) {
    config.outputPath = path.join(config.outputDir, `${config.name}.mp4`);
  }

  return config;
}

module.exports = { loadConfig, resolveDir, DEFAULTS };
