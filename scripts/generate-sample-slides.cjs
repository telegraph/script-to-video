#!/usr/bin/env node

/**
 * Generate sample slide PNGs for the example projects.
 * Creates simple but attractive slides using sharp + canvas so users
 * can run the examples immediately without providing their own slides.
 *
 * Usage: node scripts/generate-sample-slides.cjs [example-name]
 *        node scripts/generate-sample-slides.cjs              (all examples)
 */

const { createCanvas } = require('canvas');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');

const COLOUR_SCHEMES = {
  'product-tour':     { bg: '#0f172a', accent: '#38bdf8', text: '#f8fafc', subtitle: '#94a3b8' },
  'onboarding-video': { bg: '#1e1b4b', accent: '#a78bfa', text: '#f8fafc', subtitle: '#c4b5fd' },
  'release-notes':    { bg: '#022c22', accent: '#34d399', text: '#f0fdf4', subtitle: '#86efac' },
  'how-to-use':       { bg: '#18181b', accent: '#f59e0b', text: '#fafafa', subtitle: '#a1a1aa' },
};

function createSlide(width, height, opts) {
  const { title, subtitle, slideNum, total, scheme } = opts;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background gradient (simulated with rectangles)
  ctx.fillStyle = scheme.bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle gradient overlay
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(255,255,255,0.03)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Accent bar at top
  ctx.fillStyle = scheme.accent;
  ctx.fillRect(0, 0, width, 4);

  // Decorative circles
  ctx.beginPath();
  ctx.arc(width - 150, 150, 200, 0, Math.PI * 2);
  ctx.fillStyle = scheme.accent + '10';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(100, height - 100, 150, 0, Math.PI * 2);
  ctx.fillStyle = scheme.accent + '08';
  ctx.fill();

  // Slide number badge
  ctx.fillStyle = scheme.accent + '30';
  ctx.beginPath();
  ctx.roundRect(width - 90, height - 60, 60, 32, 8);
  ctx.fill();
  ctx.fillStyle = scheme.text;
  ctx.font = '14px sans-serif';
  ctx.fillText(`${slideNum + 1}/${total}`, width - 80, height - 38);

  // Title
  ctx.fillStyle = scheme.text;
  ctx.font = 'bold 48px sans-serif';

  // Word wrap title
  const words = title.split(' ');
  let lines = [];
  let currentLine = '';
  for (const word of words) {
    const test = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(test).width > width - 200) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  lines.push(currentLine);

  const lineHeight = 60;
  const startY = height / 2 - (lines.length * lineHeight) / 2;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 80, startY + i * lineHeight);
  }

  // Subtitle
  if (subtitle) {
    ctx.fillStyle = scheme.subtitle;
    ctx.font = '24px sans-serif';
    ctx.fillText(subtitle, 80, startY + lines.length * lineHeight + 30);
  }

  // Mock UI elements for non-title slides
  if (slideNum > 0 && slideNum < total - 1) {
    // Fake nav bar
    ctx.fillStyle = scheme.accent + '15';
    ctx.fillRect(0, 0, width, 56);

    // Fake nav items
    ctx.fillStyle = scheme.subtitle;
    ctx.font = '14px sans-serif';
    const navItems = ['Dashboard', 'Analytics', 'Settings', 'Help'];
    navItems.forEach((item, i) => {
      ctx.fillText(item, 80 + i * 140, 35);
    });

    // Fake content cards
    const cardY = startY + lines.length * lineHeight + 80;
    for (let i = 0; i < 3; i++) {
      const cardX = 80 + i * (Math.floor((width - 200) / 3) + 20);
      const cardW = Math.floor((width - 200) / 3);
      ctx.fillStyle = scheme.accent + '12';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, 120, 12);
      ctx.fill();

      ctx.fillStyle = scheme.accent;
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(['42%', '1.2k', '3.5s'][i], cardX + 20, cardY + 50);

      ctx.fillStyle = scheme.subtitle;
      ctx.font = '14px sans-serif';
      ctx.fillText(['Completion', 'Active Users', 'Avg Response'][i], cardX + 20, cardY + 80);
    }
  }

  return canvas.toBuffer('image/png');
}

async function generateForExample(exampleName) {
  const exampleDir = path.join(EXAMPLES_DIR, exampleName);
  const narrationPath = path.join(exampleDir, 'narration.txt');

  if (!fs.existsSync(narrationPath)) {
    console.log(`  ~ Skipping ${exampleName} (no narration.txt)`);
    return;
  }

  const narration = fs.readFileSync(narrationPath, 'utf-8');
  const paragraphs = narration.trim().split(/\n\n+/).filter(p => p.trim());

  const slidesDir = path.join(exampleDir, 'slides');
  fs.mkdirSync(slidesDir, { recursive: true });

  const scheme = COLOUR_SCHEMES[exampleName] || COLOUR_SCHEMES['product-tour'];
  const width = 1920;
  const height = 1080;

  for (let i = 0; i < paragraphs.length; i++) {
    // Extract first sentence as title
    const firstSentence = paragraphs[i].split(/\.\s/)[0];
    const title = firstSentence.length > 60
      ? firstSentence.substring(0, 57) + '…'
      : firstSentence;

    // Extract second sentence as subtitle
    const sentences = paragraphs[i].split(/\.\s/);
    const subtitle = sentences.length > 1
      ? sentences[1].substring(0, 80)
      : '';

    const buffer = createSlide(width, height, {
      title,
      subtitle,
      slideNum: i,
      total: paragraphs.length,
      scheme,
    });

    const outPath = path.join(slidesDir, `slide-${String(i).padStart(2, '0')}.png`);
    fs.writeFileSync(outPath, buffer);
    console.log(`  + ${exampleName}/slides/slide-${String(i).padStart(2, '0')}.png`);
  }

  console.log(`  ✓ ${paragraphs.length} slides generated for ${exampleName}\n`);
}

async function main() {
  const target = process.argv[2];
  console.log('\nGenerating sample slides…\n');

  if (target) {
    await generateForExample(target);
  } else {
    const examples = fs.readdirSync(EXAMPLES_DIR)
      .filter(d => fs.existsSync(path.join(EXAMPLES_DIR, d, 'narration.txt')));
    for (const ex of examples) {
      await generateForExample(ex);
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
