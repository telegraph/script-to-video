#!/usr/bin/env node

/**
 * Generate visually distinct sample slide PNGs for each example project.
 * Each example gets a unique colour scheme AND layout style so they
 * look clearly different in the demo videos.
 *
 * Usage: node scripts/generate-sample-slides.cjs [example-name]
 *        node scripts/generate-sample-slides.cjs              (all examples)
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');

// Each example gets a unique visual identity
const EXAMPLES = {
  'product-tour': {
    bg: '#0f172a', accent: '#38bdf8', text: '#f8fafc', muted: '#94a3b8',
    surface: '#1e293b', layout: 'dashboard',
    navItems: ['Dashboard', 'Analytics', 'Teams', 'Settings'],
    metrics: [
      ['92%', 'Sprint Completion', '+4%'],
      ['1,247', 'Story Points', '+12%'],
      ['2.3d', 'Avg Cycle Time', '-8%'],
      ['18', 'Active Sprints', ''],
    ],
  },
  'onboarding-video': {
    bg: '#1e1b4b', accent: '#a78bfa', text: '#f8fafc', muted: '#c4b5fd',
    surface: '#312e81', layout: 'checklist',
    navItems: ['Getting Started', 'Tools', 'Team', 'Resources'],
    steps: [
      ['Set up dev environment', true],
      ['Clone the monorepo', true],
      ['Find your team board', true],
      ['Read contribution guide', false],
      ['Ship first pull request', false],
      ['Meet your buddy', false],
    ],
  },
  'release-notes': {
    bg: '#022c22', accent: '#34d399', text: '#f0fdf4', muted: '#86efac',
    surface: '#064e3b', layout: 'changelog',
    navItems: ['v3.2', 'Features', 'Fixes', 'Performance'],
    changes: [
      ['New', 'Search experience with fuzzy matching'],
      ['New', 'System-aware dark mode'],
      ['New', 'Bulk actions for backlog management'],
      ['New', 'API v2 with webhooks'],
      ['Perf', 'Page load 40% faster'],
      ['Fix', '12 bug fixes'],
    ],
  },
  'how-to-use': {
    bg: '#18181b', accent: '#f59e0b', text: '#fafafa', muted: '#a1a1aa',
    surface: '#27272a', layout: 'tutorial',
    navItems: ['Install', 'Configure', 'Build', 'Deploy'],
    codeSnippets: [
      'npm install -g script-to-video',
      's2v init my-video',
      's2v build my-video',
      's2v voices --lang en',
      's2v transitions',
      's2v browse',
    ],
  },
};

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawBase(ctx, w, h, cfg, slideNum, total) {
  // Background
  ctx.fillStyle = cfg.bg;
  ctx.fillRect(0, 0, w, h);

  // Gradient overlay
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'rgba(255,255,255,0.02)');
  g.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Slide counter
  ctx.fillStyle = cfg.muted + '60';
  ctx.font = '14px sans-serif';
  ctx.fillText(`${slideNum + 1} / ${total}`, w - 80, h - 30);
}

function drawTitle(ctx, w, h, title, subtitle, cfg, yOffset) {
  const y = yOffset || h * 0.38;
  ctx.fillStyle = cfg.text;
  ctx.font = 'bold 46px sans-serif';
  const lines = wrapText(ctx, title, w - 180);
  lines.forEach((line, i) => ctx.fillText(line, 80, y + i * 58));

  if (subtitle) {
    ctx.fillStyle = cfg.muted;
    ctx.font = '22px sans-serif';
    const subLines = wrapText(ctx, subtitle, w - 180);
    subLines.forEach((line, i) => ctx.fillText(line, 80, y + lines.length * 58 + 20 + i * 30));
  }
  return y + lines.length * 58;
}

// ── Layout: Dashboard ──────────────────────────────────────────────────────

function drawDashboard(ctx, w, h, cfg, slideNum, total, title, subtitle) {
  drawBase(ctx, w, h, cfg, slideNum, total);

  if (slideNum === 0 || slideNum === total - 1) {
    // Title/closing slide — accent bar + centred title
    ctx.fillStyle = cfg.accent;
    ctx.fillRect(0, 0, w, 5);
    drawTitle(ctx, w, h, title, subtitle, cfg, h * 0.35);
    // Large decorative circle
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.25, 180, 0, Math.PI * 2);
    ctx.fillStyle = cfg.accent + '12';
    ctx.fill();
    return;
  }

  // Nav bar
  ctx.fillStyle = cfg.surface;
  ctx.fillRect(0, 0, w, 56);
  ctx.fillStyle = cfg.accent;
  ctx.fillRect(0, 54, w, 2);
  ctx.font = '14px sans-serif';
  cfg.navItems.forEach((item, i) => {
    ctx.fillStyle = i === (slideNum % cfg.navItems.length) ? cfg.accent : cfg.muted;
    ctx.fillText(item, 60 + i * 160, 36);
  });

  // Title area
  const titleBottom = drawTitle(ctx, w, h, title, subtitle, cfg, 100);

  // Metric cards — different values per slide
  const cardY = Math.max(titleBottom + 60, 340);
  const metrics = cfg.metrics;
  const cardW = Math.floor((w - 180) / metrics.length);

  metrics.forEach((m, i) => {
    const x = 60 + i * (cardW + 20);
    ctx.fillStyle = cfg.surface;
    ctx.beginPath();
    ctx.roundRect(x, cardY, cardW, 130, 12);
    ctx.fill();
    ctx.strokeStyle = cfg.accent + '30';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Metric value — vary by slide
    const val = slideNum % 2 === 0 ? m[0] : String(parseFloat(m[0]) || m[0]);
    ctx.fillStyle = cfg.accent;
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(val, x + 20, cardY + 50);

    ctx.fillStyle = cfg.muted;
    ctx.font = '14px sans-serif';
    ctx.fillText(m[1], x + 20, cardY + 80);

    if (m[2]) {
      ctx.fillStyle = m[2].startsWith('-') ? '#f87171' : cfg.accent;
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(m[2], x + 20, cardY + 108);
    }
  });

  // Chart area — simple bar chart that varies per slide
  const chartY = cardY + 170;
  const chartH = h - chartY - 80;
  if (chartH > 80) {
    ctx.fillStyle = cfg.surface;
    ctx.beginPath();
    ctx.roundRect(60, chartY, w - 120, chartH, 12);
    ctx.fill();

    const bars = 8;
    const barW = Math.floor((w - 200) / bars);
    for (let b = 0; b < bars; b++) {
      const barH = (Math.sin(b * 0.8 + slideNum * 1.5) * 0.3 + 0.5) * (chartH - 40);
      ctx.fillStyle = cfg.accent + (b === slideNum % bars ? 'cc' : '40');
      ctx.beginPath();
      ctx.roundRect(90 + b * barW, chartY + chartH - 20 - barH, barW - 10, barH, 4);
      ctx.fill();
    }
  }
}

// ── Layout: Checklist ──────────────────────────────────────────────────────

function drawChecklist(ctx, w, h, cfg, slideNum, total, title, subtitle) {
  drawBase(ctx, w, h, cfg, slideNum, total);

  if (slideNum === 0 || slideNum === total - 1) {
    ctx.fillStyle = cfg.accent;
    ctx.fillRect(0, h - 6, w, 6);
    drawTitle(ctx, w, h, title, subtitle, cfg, h * 0.32);
    // Decorative checkmark
    ctx.font = 'bold 200px sans-serif';
    ctx.fillStyle = cfg.accent + '10';
    ctx.fillText('✓', w * 0.7, h * 0.65);
    return;
  }

  // Side panel
  const panelW = 300;
  ctx.fillStyle = cfg.surface;
  ctx.fillRect(0, 0, panelW, h);

  // Side nav
  ctx.font = '15px sans-serif';
  cfg.navItems.forEach((item, i) => {
    const y = 80 + i * 50;
    ctx.fillStyle = i === (slideNum % cfg.navItems.length) ? cfg.accent : cfg.muted + '80';
    if (i === slideNum % cfg.navItems.length) {
      ctx.fillRect(0, y - 15, 3, 30);
    }
    ctx.fillText(item, 30, y + 5);
  });

  // Main content — title
  drawTitle(ctx, w - panelW - 40, h, title, subtitle, { ...cfg }, 90);
  // Shift text right
  ctx.save();
  ctx.translate(panelW + 40, 0);

  // Checklist items — progress changes per slide
  const startY = 240;
  const checkItems = cfg.steps;
  const completedCount = Math.min(slideNum, checkItems.length);

  checkItems.forEach(([label, _], i) => {
    const y = startY + i * 56;
    const done = i < completedCount;

    // Checkbox
    ctx.strokeStyle = done ? cfg.accent : cfg.muted + '50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, y, 28, 28, 6);
    ctx.stroke();

    if (done) {
      ctx.fillStyle = cfg.accent + '20';
      ctx.fill();
      ctx.fillStyle = cfg.accent;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('✓', 5, y + 22);
    }

    // Label
    ctx.fillStyle = done ? cfg.muted : cfg.text;
    ctx.font = `${done ? '' : 'bold '}16px sans-serif`;
    ctx.fillText(label, 44, y + 20);

    // Strikethrough if done
    if (done) {
      ctx.strokeStyle = cfg.muted + '40';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(44, y + 15);
      ctx.lineTo(44 + ctx.measureText(label).width, y + 15);
      ctx.stroke();
    }
  });

  // Progress bar
  const progressY = startY + checkItems.length * 56 + 30;
  const progressW = w - panelW - 160;
  ctx.fillStyle = cfg.surface;
  ctx.beginPath();
  ctx.roundRect(0, progressY, progressW, 12, 6);
  ctx.fill();
  ctx.fillStyle = cfg.accent;
  ctx.beginPath();
  ctx.roundRect(0, progressY, progressW * (completedCount / checkItems.length), 12, 6);
  ctx.fill();

  ctx.fillStyle = cfg.muted;
  ctx.font = '13px sans-serif';
  ctx.fillText(`${completedCount}/${checkItems.length} complete`, 0, progressY + 34);

  ctx.restore();
}

// ── Layout: Changelog ──────────────────────────────────────────────────────

function drawChangelog(ctx, w, h, cfg, slideNum, total, title, subtitle) {
  drawBase(ctx, w, h, cfg, slideNum, total);

  if (slideNum === 0 || slideNum === total - 1) {
    // Version badge
    ctx.fillStyle = cfg.accent + '20';
    ctx.beginPath();
    ctx.roundRect(80, h * 0.22, 120, 40, 20);
    ctx.fill();
    ctx.fillStyle = cfg.accent;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('v3.2.0', 108, h * 0.22 + 27);

    drawTitle(ctx, w, h, title, subtitle, cfg, h * 0.32);
    return;
  }

  // Top bar with version tabs
  ctx.fillStyle = cfg.surface;
  ctx.fillRect(0, 0, w, 60);
  ctx.font = '14px sans-serif';
  cfg.navItems.forEach((item, i) => {
    const x = 60 + i * 140;
    ctx.fillStyle = i === 0 ? cfg.accent : cfg.muted;
    ctx.fillText(item, x, 38);
    if (i === 0) {
      ctx.fillStyle = cfg.accent;
      ctx.fillRect(x, 56, ctx.measureText(item).width, 4);
    }
  });

  // Title
  drawTitle(ctx, w, h, title, subtitle, cfg, 100);

  // Change list — show different subset per slide
  const startY = 280;
  const changes = cfg.changes;
  const visibleStart = Math.min((slideNum - 1) % changes.length, changes.length - 3);

  for (let i = 0; i < Math.min(4, changes.length); i++) {
    const idx = (visibleStart + i) % changes.length;
    const [type, desc] = changes[idx];
    const y = startY + i * 80;

    // Type badge
    const badgeColors = { New: cfg.accent, Perf: '#fbbf24', Fix: '#f87171' };
    const badgeColor = badgeColors[type] || cfg.accent;
    ctx.fillStyle = badgeColor + '20';
    ctx.beginPath();
    ctx.roundRect(80, y, 60, 28, 14);
    ctx.fill();
    ctx.fillStyle = badgeColor;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(type, 95, y + 19);

    // Description
    ctx.fillStyle = cfg.text;
    ctx.font = '18px sans-serif';
    ctx.fillText(desc, 160, y + 20);

    // Separator
    ctx.strokeStyle = cfg.surface;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, y + 50);
    ctx.lineTo(w - 80, y + 50);
    ctx.stroke();
  }

  // Stats sidebar
  const sideX = w - 320;
  ctx.fillStyle = cfg.surface;
  ctx.beginPath();
  ctx.roundRect(sideX, 100, 260, 400, 12);
  ctx.fill();

  const stats = [
    ['Features', '4'],
    ['Bug Fixes', '12'],
    ['Performance', '-40% load time'],
    ['Breaking', '0'],
  ];
  stats.forEach(([label, val], i) => {
    const sy = 140 + i * 80;
    ctx.fillStyle = cfg.muted;
    ctx.font = '13px sans-serif';
    ctx.fillText(label, sideX + 24, sy);
    ctx.fillStyle = cfg.accent;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(val, sideX + 24, sy + 32);
  });
}

// ── Layout: Tutorial ───────────────────────────────────────────────────────

function drawTutorial(ctx, w, h, cfg, slideNum, total, title, subtitle) {
  drawBase(ctx, w, h, cfg, slideNum, total);

  if (slideNum === 0 || slideNum === total - 1) {
    // Terminal icon
    ctx.fillStyle = cfg.surface;
    ctx.beginPath();
    ctx.roundRect(w * 0.65, h * 0.15, 300, 200, 12);
    ctx.fill();
    ctx.strokeStyle = cfg.accent + '40';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Terminal dots
    ['#f87171', '#fbbf24', '#34d399'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(w * 0.65 + 24 + i * 20, h * 0.15 + 20, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Terminal text
    ctx.fillStyle = cfg.accent;
    ctx.font = '14px monospace';
    ctx.fillText('$ s2v build', w * 0.65 + 20, h * 0.15 + 60);
    ctx.fillStyle = cfg.muted;
    ctx.fillText('  Building video...', w * 0.65 + 20, h * 0.15 + 85);
    ctx.fillStyle = '#34d399';
    ctx.fillText('  ✓ Done: output/my-video.mp4', w * 0.65 + 20, h * 0.15 + 110);

    drawTitle(ctx, w * 0.6, h, title, subtitle, cfg, h * 0.45);
    return;
  }

  // Step indicator at top
  ctx.fillStyle = cfg.surface;
  ctx.fillRect(0, 0, w, 70);
  for (let s = 0; s < total - 2; s++) {
    const x = 60 + s * 100;
    ctx.fillStyle = s < slideNum ? cfg.accent : (s === slideNum - 1 ? cfg.accent : cfg.muted + '40');
    ctx.beginPath();
    ctx.arc(x + 16, 35, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = s <= slideNum - 1 ? cfg.bg : cfg.muted;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(String(s + 1), x + 11, 40);

    if (s < total - 3) {
      ctx.strokeStyle = s < slideNum - 1 ? cfg.accent + '60' : cfg.muted + '20';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 34, 35);
      ctx.lineTo(x + 96, 35);
      ctx.stroke();
    }
  }

  // Title
  drawTitle(ctx, w, h, title, subtitle, cfg, 110);

  // Code block
  const codeY = 320;
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.roundRect(60, codeY, w - 120, 260, 12);
  ctx.fill();
  ctx.strokeStyle = cfg.accent + '30';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Terminal header dots
  ['#f87171', '#fbbf24', '#34d399'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(84 + i * 18, codeY + 18, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Code content — different snippets per slide
  ctx.font = '15px monospace';
  const snippetIdx = Math.min(slideNum - 1, cfg.codeSnippets.length - 1);
  const visibleSnippets = cfg.codeSnippets.slice(
    Math.max(0, snippetIdx - 2),
    snippetIdx + 4
  );
  visibleSnippets.forEach((line, i) => {
    const ly = codeY + 50 + i * 32;
    ctx.fillStyle = cfg.accent;
    ctx.fillText('$', 84, ly);
    ctx.fillStyle = i === Math.min(2, snippetIdx) ? cfg.text : cfg.muted + '80';
    ctx.fillText(line, 104, ly);

    // Cursor on active line
    if (i === Math.min(2, snippetIdx)) {
      const cursorX = 104 + ctx.measureText(line).width + 4;
      ctx.fillStyle = cfg.accent;
      ctx.fillRect(cursorX, ly - 14, 10, 18);
    }
  });

  // Tip box
  const tipY = codeY + 280;
  if (tipY + 60 < h - 50) {
    ctx.fillStyle = cfg.accent + '10';
    ctx.beginPath();
    ctx.roundRect(60, tipY, w - 120, 50, 8);
    ctx.fill();
    ctx.fillStyle = cfg.accent;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('TIP', 80, tipY + 32);
    ctx.fillStyle = cfg.muted;
    ctx.font = '14px sans-serif';
    const tips = [
      'Run s2v voices to browse all available TTS voices',
      'Use --watch to auto-rebuild on changes',
      'Add --music ambient for background music',
      'Set transition: wipeleft in demo.yaml',
      'Run s2v browse for a local preview UI',
      'Add --subtitles to generate .srt files',
    ];
    ctx.fillText(tips[slideNum % tips.length], 120, tipY + 32);
  }
}

// ── Dispatcher ─────────────────────────────────────────────────────────────

const LAYOUT_FUNCTIONS = {
  dashboard: drawDashboard,
  checklist: drawChecklist,
  changelog: drawChangelog,
  tutorial: drawTutorial,
};

async function generateForExample(exampleName) {
  const exampleDir = path.join(EXAMPLES_DIR, exampleName);
  const narrationPath = path.join(exampleDir, 'narration.txt');

  if (!fs.existsSync(narrationPath)) {
    console.log(`  ~ Skipping ${exampleName} (no narration.txt)`);
    return;
  }

  const cfg = EXAMPLES[exampleName];
  if (!cfg) {
    console.log(`  ~ Skipping ${exampleName} (no config — add it to EXAMPLES)`);
    return;
  }

  const narration = fs.readFileSync(narrationPath, 'utf-8');
  const paragraphs = narration.trim().split(/\n\n+/).filter(p => p.trim());

  const slidesDir = path.join(exampleDir, 'slides');
  fs.mkdirSync(slidesDir, { recursive: true });

  const w = 1920, h = 1080;
  const drawFn = LAYOUT_FUNCTIONS[cfg.layout];

  for (let i = 0; i < paragraphs.length; i++) {
    const firstSentence = paragraphs[i].split(/\.\s/)[0];
    const title = firstSentence.length > 60 ? firstSentence.substring(0, 57) + '…' : firstSentence;
    const sentences = paragraphs[i].split(/\.\s/);
    const subtitle = sentences.length > 1 ? sentences[1].substring(0, 80) : '';

    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    drawFn(ctx, w, h, cfg, i, paragraphs.length, title, subtitle);

    const outPath = path.join(slidesDir, `slide-${String(i).padStart(2, '0')}.png`);
    fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
    console.log(`  + ${exampleName}/slide-${String(i).padStart(2, '0')}.png`);
  }

  console.log(`  ✓ ${paragraphs.length} slides (${cfg.layout} layout) for ${exampleName}\n`);
}

async function main() {
  const target = process.argv[2];
  console.log('\nGenerating sample slides…\n');

  if (target) {
    await generateForExample(target);
  } else {
    for (const name of Object.keys(EXAMPLES)) {
      await generateForExample(name);
    }
  }
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
