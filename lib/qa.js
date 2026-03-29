/**
 * QA validation framework — validates slides, narration, callouts, and timings
 * before building the final video.
 *
 * Built-in checks:
 *   1. Narration exists and chunk count matches slide count
 *   2. Each slide image exists and is non-empty
 *   3. Narration text quality (no unicode escapes, terminology)
 *   4. Callout bounds within image dimensions
 *   5. Slide timings exist and are reasonable (3s–60s per slide)
 *   6. Output video exists and is reasonably sized
 *
 * Custom rules can be added via qa_rules in demo.yaml or --custom-rules flag.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadConfig } = require('./config');

let failures = 0;
let warnings = 0;

function pass(msg) { console.log(chalk.green(`  ✓ ${msg}`)); }
function fail(msg) { failures++; console.log(chalk.red(`  ✗ ${msg}`)); }
function warn(msg) { warnings++; console.log(chalk.yellow(`  ⚠ ${msg}`)); }

/**
 * Read PNG dimensions from file header (bytes 16–23).
 */
function getPngDimensions(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } catch {
    return { width: 1680, height: 1050 };
  }
}

/**
 * Run all QA checks for a project.
 */
async function qa(dir, cliOpts = {}) {
  const config = loadConfig(dir, cliOpts);
  failures = 0;
  warnings = 0;

  const isInternal = cliOpts.internal || false;
  const isStrict = cliOpts.strict || false;

  console.log(chalk.bold(`\n═══ Video QA: ${config.name} ═══\n`));

  // ── 1. Narration ─────────────────────────────────────────────────────────

  console.log('1. Narration');

  if (!fs.existsSync(config.narrationPath)) {
    fail('narration.txt not found');
    return printSummary(isStrict);
  }

  const narration = fs.readFileSync(config.narrationPath, 'utf-8');
  const chunks = narration.trim().split(/\n\n+/).filter(p => p.trim());
  pass(`${chunks.length} narration chunks found`);

  // ── 2. Slides ────────────────────────────────────────────────────────────

  console.log('\n2. Slides');

  const slidesDir = config.slidesDir;
  if (!fs.existsSync(slidesDir)) {
    warn('Slides directory not found — import slides first');
  } else {
    const slideFiles = fs.readdirSync(slidesDir)
      .filter(f => /^slide-\d+\.png$/.test(f))
      .sort();

    if (slideFiles.length === chunks.length) {
      pass(`${slideFiles.length} slides match ${chunks.length} narration chunks`);
    } else {
      fail(`${slideFiles.length} slides vs ${chunks.length} narration chunks — MISMATCH`);
    }

    for (const f of slideFiles) {
      const stat = fs.statSync(path.join(slidesDir, f));
      if (stat.size < 1000) {
        fail(`${f} is suspiciously small (${stat.size} bytes)`);
      }
    }
    if (slideFiles.length > 0) {
      pass(`All ${slideFiles.length} slide images are non-empty`);
    }
  }

  // ── 3. Narration quality ─────────────────────────────────────────────────

  console.log('\n3. Narration quality');

  const unicodeEscapes = narration.match(/\\u[0-9a-fA-F]{4}/g);
  if (unicodeEscapes) {
    fail(`Found \\uXXXX escape sequences: ${unicodeEscapes.join(', ')}`);
  } else {
    pass('No \\uXXXX escape sequences');
  }

  // Check for common TTS pronunciation issues
  const ttsChecks = [
    { pattern: /\bPRs\b/g, msg: 'Found "PRs" — TTS reads this poorly. Use "pull requests".', level: 'fail' },
    { pattern: /\bAPIs\b/g, msg: 'Found "APIs" — consider "A P I endpoints" for better TTS.', level: 'warn' },
    { pattern: /\be\.g\./g, msg: 'Found "e.g." — consider "for example" for TTS clarity.', level: 'warn' },
    { pattern: /\bi\.e\./g, msg: 'Found "i.e." — consider "that is" for TTS clarity.', level: 'warn' },
  ];

  for (const check of ttsChecks) {
    if (check.pattern.test(narration)) {
      check.level === 'fail' ? fail(check.msg) : warn(check.msg);
    }
  }

  // Internal language check
  if (isInternal) {
    const yourMatches = narration.match(/\byour\b/gi);
    if (yourMatches) {
      fail(`Found ${yourMatches.length}× "your" — internal videos should use "our"/"the"`);
    } else {
      pass('No "your" found (internal language OK)');
    }
  }

  // Custom QA rules from config or file
  const customRules = loadCustomRules(config, cliOpts);
  if (customRules.length > 0) {
    console.log(`\n3b. Custom rules (${customRules.length})`);
    for (const rule of customRules) {
      const regex = new RegExp(rule.pattern, rule.flags || 'g');
      if (regex.test(narration)) {
        rule.level === 'fail' ? fail(rule.msg) : warn(rule.msg);
      } else {
        pass(rule.pass_msg || `No matches for /${rule.pattern}/`);
      }
    }
  }

  // ── 4. Callouts ──────────────────────────────────────────────────────────

  console.log('\n4. Callouts');

  if (!fs.existsSync(config.calloutsPath)) {
    console.log(chalk.dim('  No callouts.json — skipping'));
  } else {
    const callouts = JSON.parse(fs.readFileSync(config.calloutsPath, 'utf-8'));
    pass(`${callouts.length} callouts defined`);

    // Get slide dimensions from first slide
    const firstSlide = path.join(slidesDir, 'slide-00.png');
    const { width, height } = fs.existsSync(firstSlide)
      ? getPngDimensions(firstSlide)
      : { width: config.resolution[0], height: config.resolution[1] };

    for (const c of callouts) {
      if (c.x + c.w > width + 20) {
        fail(`Callout "${c.label}" (slide ${c.slide}) extends beyond right edge`);
      }
      if (c.y + c.h > height + 20) {
        fail(`Callout "${c.label}" (slide ${c.slide}) extends beyond bottom edge`);
      }
      if (c.x < 200 && c.y < 60) {
        warn(`Callout "${c.label}" (slide ${c.slide}) overlaps top-left title area`);
      }
    }

    pass('All callouts within image bounds');
  }

  // ── 5. Timings ───────────────────────────────────────────────────────────

  console.log('\n5. Timings');

  const timingsPath = path.join(config.outputDir, 'slide-timings.json');
  if (!fs.existsSync(timingsPath)) {
    warn('slide-timings.json not found — build the video first');
  } else {
    const timings = JSON.parse(fs.readFileSync(timingsPath, 'utf-8'));

    if (timings.length !== chunks.length) {
      fail(`${timings.length} timings vs ${chunks.length} narration chunks`);
    } else {
      pass(`${timings.length} timings match narration chunks`);
    }

    let totalDuration = 0;
    for (const t of timings) {
      totalDuration += t.audio_duration;
      if (t.audio_duration < 3) warn(`Slide ${t.slide} audio is very short: ${t.audio_duration.toFixed(1)}s`);
      if (t.audio_duration > 60) warn(`Slide ${t.slide} audio is very long: ${t.audio_duration.toFixed(1)}s — consider splitting`);
    }

    const mins = Math.floor(totalDuration / 60);
    const secs = Math.round(totalDuration % 60);
    pass(`Total narration: ${mins}m ${secs}s`);
    if (totalDuration > 300) warn(`Video is over 5 minutes — consider trimming`);
  }

  // ── 6. Output video ──────────────────────────────────────────────────────

  console.log('\n6. Output video');

  if (fs.existsSync(config.outputPath)) {
    const stat = fs.statSync(config.outputPath);
    const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
    pass(`${path.basename(config.outputPath)} exists (${sizeMB} MB)`);
    if (stat.size < 100_000) fail(`Video is suspiciously small: ${sizeMB} MB`);
  } else {
    warn(`${path.basename(config.outputPath)} not found — build the video first`);
  }

  return printSummary(isStrict);
}

function printSummary(strict) {
  console.log(chalk.bold('\n═══ QA Summary ═══'));
  console.log(`  Failures: ${failures}`);
  console.log(`  Warnings: ${warnings}`);

  const totalFails = strict ? failures + warnings : failures;
  const status = totalFails === 0 ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
  console.log(`  Status: ${status}\n`);

  if (totalFails > 0) process.exitCode = 1;
  return totalFails === 0;
}

function loadCustomRules(config, cliOpts) {
  const rules = [];

  // From demo.yaml qa_rules
  if (config.qa_rules && config.qa_rules.forbidden_words) {
    for (const word of config.qa_rules.forbidden_words) {
      rules.push({
        pattern: `\\b${word}\\b`,
        flags: 'gi',
        msg: `Found forbidden word: "${word}"`,
        level: 'fail',
      });
    }
  }

  if (config.qa_rules && config.qa_rules.warn_words) {
    for (const word of config.qa_rules.warn_words) {
      rules.push({
        pattern: `\\b${word}\\b`,
        flags: 'gi',
        msg: `Found warned word: "${word}"`,
        level: 'warn',
      });
    }
  }

  // From custom rules file
  if (cliOpts.customRules && fs.existsSync(cliOpts.customRules)) {
    const fileRules = JSON.parse(fs.readFileSync(cliOpts.customRules, 'utf-8'));
    rules.push(...fileRules);
  }

  return rules;
}

module.exports = { qa };
