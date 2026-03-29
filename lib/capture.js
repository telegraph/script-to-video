/**
 * Capture command — placeholder for Playwright-based slide capture.
 *
 * This module is intentionally minimal. The script-to-video toolkit focuses
 * on the "slides + narration → video" pipeline. Slide capture is left to the
 * user because it's inherently app-specific.
 *
 * If a capture-slides.cjs exists in the project directory, this will run it.
 * Otherwise it points users to the import command for PPTX/Google Slides.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadConfig } = require('./config');

async function capture(dir, cliOpts = {}) {
  const config = loadConfig(dir, cliOpts);
  const captureScript = path.join(config.projectDir, 'capture-slides.cjs');

  if (fs.existsSync(captureScript)) {
    console.log(chalk.bold('\n  Running capture-slides.cjs…'));
    execSync(`node "${captureScript}"`, {
      cwd: config.projectDir,
      stdio: 'inherit',
    });
    console.log(chalk.green('\n  Capture complete.\n'));
  } else {
    console.log(chalk.yellow('\n  No capture-slides.cjs found in this project.'));
    console.log(chalk.dim('  To get slides into your project, use one of:'));
    console.log(chalk.dim('    1. Drop PNGs into slides/ directory'));
    console.log(chalk.dim('    2. s2v import (for PPTX or Google Slides)'));
    console.log(chalk.dim('    3. Write your own capture-slides.cjs with Playwright\n'));
  }
}

module.exports = { capture };
