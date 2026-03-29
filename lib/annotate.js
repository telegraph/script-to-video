/**
 * Slide annotator — composites highlight rectangles and label pills onto
 * slide PNGs using sharp + canvas, driven by callouts.json.
 *
 * callouts.json format:
 * [
 *   { "slide": 0, "label": "Click here", "x": 100, "y": 200, "w": 300, "h": 50 },
 *   ...
 * ]
 */

const sharp = require('sharp');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Default annotation styling — can be overridden in demo.yaml under "annotation_style"
const DEFAULT_STYLE = {
  highlight_colour: 'rgba(255,220,0,0.35)',
  border_colour: '#FFD700',
  border_width: 2.5,
  border_radius: 6,
  label_bg: '#FFD700',
  label_text: '#1a1a1a',
  label_font: 'bold 13px sans-serif',
  label_height: 30,
  label_padding: 10,
};

/**
 * Annotate a single slide with a callout highlight + label.
 */
async function annotateSlide(slidesDir, outDir, callout, style = {}) {
  const s = { ...DEFAULT_STYLE, ...style };
  const { slide, label, x, y, w, h } = callout;
  const padded = String(slide).padStart(2, '0');
  const inPath = path.join(slidesDir, `slide-${padded}.png`);
  const outPath = path.join(outDir, `slide-${padded}.png`);

  if (!fs.existsSync(inPath)) {
    console.log(chalk.dim(`  ~ slide-${padded} not found, skipping`));
    return;
  }

  // Highlight rectangle as SVG overlay
  const highlightSvg = `
    <svg width="${w + 8}" height="${h + 8}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${w + 8}" height="${h + 8}"
            rx="${s.border_radius}" ry="${s.border_radius}"
            fill="${s.highlight_colour}"
            stroke="${s.border_colour}"
            stroke-width="${s.border_width}"/>
    </svg>`;

  // Label pill rendered via canvas (for reliable font rendering)
  const textWidth = label.length * 8 + s.label_padding * 2;
  const canvas = createCanvas(textWidth, s.label_height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = s.label_bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, textWidth, s.label_height, s.border_radius);
  ctx.fill();

  ctx.fillStyle = s.label_text;
  ctx.font = s.label_font;
  ctx.fillText(label, s.label_padding, 20);

  // Composite both layers onto the slide
  await sharp(inPath)
    .composite([
      {
        input: Buffer.from(highlightSvg),
        left: Math.max(0, x - 4),
        top: Math.max(0, y - 4),
      },
      {
        input: canvas.toBuffer(),
        left: Math.max(0, x),
        top: Math.max(0, y - s.label_height - 4),
      },
    ])
    .toFile(outPath);

  console.log(chalk.green(`  + slide-${padded} — "${label}"`));
}

/**
 * Annotate all slides referenced in callouts.json.
 * Copies unannotated slides as-is so every slide exists in output.
 */
async function annotateSlides(config) {
  const slidesDir = config.slidesDir;
  const outDir = config.annotatedDir;
  const calloutsPath = config.calloutsPath;
  const style = config.annotation_style || {};

  fs.mkdirSync(outDir, { recursive: true });

  // Copy all slides first (unannotated pass-through)
  if (fs.existsSync(slidesDir)) {
    for (const f of fs.readdirSync(slidesDir)) {
      if (f.endsWith('.png')) {
        fs.copyFileSync(path.join(slidesDir, f), path.join(outDir, f));
      }
    }
  }

  if (!fs.existsSync(calloutsPath)) {
    console.log(chalk.dim('  No callouts.json — slides copied as-is'));
    return;
  }

  const callouts = JSON.parse(fs.readFileSync(calloutsPath, 'utf-8'));
  console.log(chalk.blue(`  ${callouts.length} callouts to apply`));

  for (const c of callouts) {
    await annotateSlide(slidesDir, outDir, c, style);
  }

  console.log(chalk.green('  All callouts applied'));
}

module.exports = { annotateSlides, annotateSlide, DEFAULT_STYLE };
