/**
 * Thumbnail generator — extracts a poster frame from slide 1 and optionally
 * resizes it for use as video thumbnail / social preview.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadConfig } = require('./config');

async function thumbnail(dir, cliOpts = {}) {
  const config = loadConfig(dir, cliOpts);
  const width = cliOpts.width || 640;

  // Find the first slide
  const slidesDir = fs.existsSync(config.annotatedDir) &&
    fs.readdirSync(config.annotatedDir).some(f => f.endsWith('.png'))
    ? config.annotatedDir
    : config.slidesDir;

  const firstSlide = path.join(slidesDir, 'slide-00.png');
  if (!fs.existsSync(firstSlide)) {
    throw new Error(`No slide-00.png found in ${slidesDir}. Import slides first.`);
  }

  const outputPath = cliOpts.output || path.join(config.outputDir, `${config.name}-thumb.png`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  await sharp(firstSlide)
    .resize(width)
    .png({ quality: 90 })
    .toFile(outputPath);

  const stat = fs.statSync(outputPath);
  console.log(chalk.green(`  + ${path.basename(outputPath)} (${width}px wide, ${(stat.size / 1024).toFixed(0)} KB)`));
}

module.exports = { thumbnail };
