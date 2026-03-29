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

// ── Layout: Tutorial (rich, visually distinct per slide) ───────────────────

// Per-slide visual content for how-to-use
const TUTORIAL_VISUALS = [
  // Slide 0: Title — hero with large terminal
  { type: 'hero' },
  // Slide 1: Agent skill — feature cards
  { type: 'cards', icon: '🤖', cards: [
    { title: 'Copilot', sub: 'GitHub Copilot agent' },
    { title: 'Claude', sub: 'Claude Code / Cursor' },
    { title: 'Any Agent', sub: 'Portable skill file' },
  ], cmd: 'curl -sL .../SKILL.md > .github/skills/video/SKILL.md' },
  // Slide 2: from-doc — terminal with command
  { type: 'terminal', icon: '📄', lines: [
    { prompt: true, text: 'npx s2v from-doc "https://docs.google.com/..." \\' },
    { text: '  --slides ./screenshots/ --name demo --music ambient' },
    { text: '' },
    { text: '  Fetching Google Doc (authenticated)…', color: 'accent' },
    { text: '  + narration.txt (7 paragraphs = 7 slides)', color: 'green' },
    { text: '  + 7 slides copied', color: 'green' },
    { text: '  + demo.yaml', color: 'green' },
    { text: '' },
    { prompt: true, text: 'npx s2v build demo' },
    { text: '  ✓ Done: demo/output/demo.mp4', color: 'green' },
  ]},
  // Slide 3: Auth — icon + steps
  { type: 'steps', icon: '🔐', items: [
    { label: 'gcloud auth application-default login', desc: 'Opens browser → sign in → done' },
    { label: 'Service account (CI/CD)', desc: 'export GOOGLE_APPLICATION_CREDENTIALS=...' },
    { label: 'API key', desc: 'export GOOGLE_API_KEY=...' },
  ]},
  // Slide 4: Slide sources — three columns
  { type: 'cards', icon: '🖼', cards: [
    { title: 'Google Slides', sub: 'slides_source: google-slides' },
    { title: 'PowerPoint', sub: 'slides_source: pptx' },
    { title: 'PNG folder', sub: 'slides_source: directory' },
  ], cmd: 'npx s2v import my-video' },
  // Slide 5: Manual route — project structure
  { type: 'structure', icon: '📁' },
  // Slide 6: Voices — voice grid
  { type: 'voices', icon: '🎙' },
  // Slide 7: Transitions — chip grid
  { type: 'transitions', icon: '✨' },
  // Slide 8: Music — waveform cards
  { type: 'music', icon: '🎵' },
  // Slide 9: Browse UI — browser window
  { type: 'browser', icon: '🌐' },
  // Slide 10: Recap — summary
  { type: 'hero' },
];

function drawTerminalWindow(ctx, x, y, w, h, cfg) {
  // Window frame
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = cfg.accent + '25';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Title bar
  ctx.fillStyle = '#161616';
  ctx.beginPath();
  ctx.roundRect(x, y, w, 36, [14, 14, 0, 0]);
  ctx.fill();

  // Traffic lights
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x + 20 + i * 22, y + 18, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Title text
  ctx.fillStyle = cfg.muted + '80';
  ctx.font = '12px sans-serif';
  ctx.fillText('Terminal', x + w / 2 - 25, y + 22);

  return y + 44; // content start Y
}

function drawTutorial(ctx, w, h, cfg, slideNum, total, title, subtitle) {
  const vis = TUTORIAL_VISUALS[slideNum] || { type: 'hero' };

  // Rich gradient background
  const g1 = ctx.createLinearGradient(0, 0, w, h);
  g1.addColorStop(0, cfg.bg);
  g1.addColorStop(0.6, cfg.surface);
  g1.addColorStop(1, cfg.bg);
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, w, h);

  // Decorative gradient orbs
  const orbGrad = ctx.createRadialGradient(w * 0.85, h * 0.2, 0, w * 0.85, h * 0.2, 300);
  orbGrad.addColorStop(0, cfg.accent + '15');
  orbGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = orbGrad;
  ctx.fillRect(0, 0, w, h);

  const orbGrad2 = ctx.createRadialGradient(w * 0.1, h * 0.8, 0, w * 0.1, h * 0.8, 250);
  orbGrad2.addColorStop(0, cfg.accent + '0a');
  orbGrad2.addColorStop(1, 'transparent');
  ctx.fillStyle = orbGrad2;
  ctx.fillRect(0, 0, w, h);

  // Accent line at bottom
  const lineGrad = ctx.createLinearGradient(0, 0, w, 0);
  lineGrad.addColorStop(0, 'transparent');
  lineGrad.addColorStop(0.3, cfg.accent + '80');
  lineGrad.addColorStop(0.7, cfg.accent + '80');
  lineGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(0, h - 3, w, 3);

  // Slide counter pill
  ctx.fillStyle = cfg.accent + '20';
  ctx.beginPath();
  ctx.roundRect(w - 100, h - 50, 70, 28, 14);
  ctx.fill();
  ctx.fillStyle = cfg.accent;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`${slideNum + 1}/${total}`, w - 88, h - 31);

  // ── HERO (title/closing) ─────────────────────────────────────────────
  if (vis.type === 'hero') {
    // Large icon/emoji
    if (slideNum === 0) {
      // Big terminal mockup
      const ty = drawTerminalWindow(ctx, w * 0.55, 120, 420, 280, cfg);
      ctx.font = '16px monospace';
      const termLines = [
        { t: '$ npx s2v from-doc "doc-url"', c: cfg.text },
        { t: '  ✓ narration.txt ready', c: '#34d399' },
        { t: '  ✓ 7 slides imported', c: '#34d399' },
        { t: '', c: '' },
        { t: '$ npx s2v build my-video', c: cfg.text },
        { t: '  ✓ Done: my-video.mp4', c: '#34d399' },
      ];
      termLines.forEach((l, i) => {
        if (!l.t) return;
        ctx.fillStyle = l.c;
        ctx.fillText(l.t, w * 0.55 + 20, ty + 8 + i * 28);
      });
    }

    // Title — big and bold
    ctx.fillStyle = cfg.text;
    ctx.font = 'bold 56px sans-serif';
    const tLines = wrapText(ctx, title, slideNum === 0 ? w * 0.5 : w - 160);
    const tY = slideNum === 0 ? 200 : h * 0.3;
    tLines.forEach((line, i) => ctx.fillText(line, 80, tY + i * 68));

    if (subtitle) {
      ctx.fillStyle = cfg.muted;
      ctx.font = '24px sans-serif';
      const sLines = wrapText(ctx, subtitle, slideNum === 0 ? w * 0.5 : w - 160);
      sLines.forEach((line, i) => ctx.fillText(line, 80, tY + tLines.length * 68 + 20 + i * 32));
    }
    return;
  }

  // ── Content slides ───────────────────────────────────────────────────

  // Icon + Title area
  if (vis.icon) {
    ctx.font = '52px sans-serif';
    ctx.fillText(vis.icon, 70, 90);
  }
  ctx.fillStyle = cfg.text;
  ctx.font = 'bold 38px sans-serif';
  const titleLines = wrapText(ctx, title, w - 180);
  titleLines.forEach((line, i) => ctx.fillText(line, vis.icon ? 140 : 70, 82 + i * 48));

  if (subtitle) {
    ctx.fillStyle = cfg.muted;
    ctx.font = '20px sans-serif';
    const sLines = wrapText(ctx, subtitle, w - 180);
    sLines.forEach((line, i) => ctx.fillText(line, vis.icon ? 140 : 70, 82 + titleLines.length * 48 + 12 + i * 28));
  }

  const contentY = 82 + titleLines.length * 48 + 60;

  // ── CARDS ────────────────────────────────────────────────────────────
  if (vis.type === 'cards') {
    const cards = vis.cards;
    const cardW = Math.floor((w - 160 - (cards.length - 1) * 24) / cards.length);
    cards.forEach((card, i) => {
      const cx = 70 + i * (cardW + 24);
      const cy = contentY + 20;

      // Card bg with gradient
      const cg = ctx.createLinearGradient(cx, cy, cx, cy + 200);
      cg.addColorStop(0, cfg.accent + '18');
      cg.addColorStop(1, cfg.accent + '05');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, 200, 16);
      ctx.fill();
      ctx.strokeStyle = cfg.accent + '30';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Card icon circle
      ctx.fillStyle = cfg.accent + '25';
      ctx.beginPath();
      ctx.arc(cx + cardW / 2, cy + 60, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cfg.accent;
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(String(i + 1), cx + cardW / 2 - 7, cy + 68);

      // Card title
      ctx.fillStyle = cfg.text;
      ctx.font = 'bold 22px sans-serif';
      const tw = ctx.measureText(card.title).width;
      ctx.fillText(card.title, cx + (cardW - tw) / 2, cy + 120);

      // Card subtitle
      ctx.fillStyle = cfg.muted;
      ctx.font = '14px sans-serif';
      const sw = ctx.measureText(card.sub).width;
      ctx.fillText(card.sub, cx + (cardW - sw) / 2, cy + 150);
    });

    // Command below cards
    if (vis.cmd) {
      const cmdY = contentY + 260;
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.roundRect(70, cmdY, w - 140, 50, 10);
      ctx.fill();
      ctx.fillStyle = cfg.accent;
      ctx.font = '15px monospace';
      ctx.fillText('$ ' + vis.cmd, 90, cmdY + 32);
    }
  }

  // ── TERMINAL ─────────────────────────────────────────────────────────
  if (vis.type === 'terminal') {
    const tStartY = drawTerminalWindow(ctx, 70, contentY, w - 140, 450, cfg);
    ctx.font = '16px monospace';
    vis.lines.forEach((line, i) => {
      const ly = tStartY + 10 + i * 30;
      if (line.prompt) {
        ctx.fillStyle = cfg.accent;
        ctx.fillText('$', 94, ly);
        ctx.fillStyle = cfg.text;
        ctx.fillText(line.text, 114, ly);
      } else if (line.color === 'green') {
        ctx.fillStyle = '#34d399';
        ctx.fillText(line.text, 94, ly);
      } else if (line.color === 'accent') {
        ctx.fillStyle = cfg.accent;
        ctx.fillText(line.text, 94, ly);
      } else {
        ctx.fillStyle = cfg.muted;
        ctx.fillText(line.text, 94, ly);
      }
    });
  }

  // ── STEPS ────────────────────────────────────────────────────────────
  if (vis.type === 'steps') {
    vis.items.forEach((item, i) => {
      const sy = contentY + 20 + i * 140;

      // Step number circle
      ctx.fillStyle = cfg.accent;
      ctx.beginPath();
      ctx.arc(110, sy + 30, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cfg.bg;
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(String(i + 1), 103, sy + 38);

      // Step label
      ctx.fillStyle = cfg.text;
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(item.label, 160, sy + 30);

      // Step description
      ctx.fillStyle = cfg.muted;
      ctx.font = '16px sans-serif';
      ctx.fillText(item.desc, 160, sy + 60);

      // Connector line
      if (i < vis.items.length - 1) {
        ctx.strokeStyle = cfg.accent + '30';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(110, sy + 56);
        ctx.lineTo(110, sy + 120);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }

  // ── STRUCTURE ────────────────────────────────────────────────────────
  if (vis.type === 'structure') {
    const items = [
      { indent: 0, name: 'my-video/', icon: '📁', note: '' },
      { indent: 1, name: 'demo.yaml', icon: '⚙', note: 'voice, transition, music' },
      { indent: 1, name: 'narration.txt', icon: '📝', note: 'one paragraph per slide' },
      { indent: 1, name: 'slides/', icon: '🖼', note: 'slide-00.png, slide-01.png, …' },
      { indent: 1, name: 'output/', icon: '📦', note: 'generated video + subtitles' },
    ];
    items.forEach((item, i) => {
      const iy = contentY + 30 + i * 80;
      const ix = 90 + item.indent * 40;

      // Connection line
      if (item.indent > 0) {
        ctx.strokeStyle = cfg.accent + '30';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ix - 20, iy - 30);
        ctx.lineTo(ix - 20, iy + 10);
        ctx.lineTo(ix, iy + 10);
        ctx.stroke();
      }

      ctx.font = '28px sans-serif';
      ctx.fillText(item.icon, ix, iy + 16);
      ctx.fillStyle = cfg.text;
      ctx.font = item.indent === 0 ? 'bold 24px sans-serif' : '22px sans-serif';
      ctx.fillText(item.name, ix + 40, iy + 14);
      if (item.note) {
        ctx.fillStyle = cfg.muted;
        ctx.font = '15px sans-serif';
        ctx.fillText(item.note, ix + 40, iy + 40);
      }
    });

    // Command at bottom
    const cmdY = contentY + 450;
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.roundRect(70, cmdY, 500, 44, 10);
    ctx.fill();
    ctx.fillStyle = cfg.accent;
    ctx.font = '15px monospace';
    ctx.fillText('$ npx s2v init my-video', 90, cmdY + 28);
  }

  // ── VOICES ───────────────────────────────────────────────────────────
  if (vis.type === 'voices') {
    const voices = [
      { name: 'RyanNeural', accent: 'British', gender: 'M', best: 'Professional demos' },
      { name: 'SoniaNeural', accent: 'British', gender: 'F', best: 'Executive pres.' },
      { name: 'GuyNeural', accent: 'American', gender: 'M', best: 'Casual tutorials' },
      { name: 'JennyNeural', accent: 'American', gender: 'F', best: 'Training' },
      { name: 'AriaNeural', accent: 'American', gender: 'F', best: 'Marketing' },
      { name: 'DavisNeural', accent: 'American', gender: 'M', best: 'Technical' },
    ];
    const colW = Math.floor((w - 180) / 3);
    voices.forEach((v, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const vx = 70 + col * (colW + 20);
      const vy = contentY + 10 + row * 180;

      ctx.fillStyle = cfg.accent + '10';
      ctx.beginPath();
      ctx.roundRect(vx, vy, colW, 150, 12);
      ctx.fill();
      ctx.strokeStyle = cfg.accent + '20';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Avatar circle
      ctx.fillStyle = cfg.accent + '30';
      ctx.beginPath();
      ctx.arc(vx + 40, vy + 45, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cfg.text;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(v.gender, vx + 33, vy + 52);

      // Name
      ctx.fillStyle = cfg.accent;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(v.name, vx + 76, vy + 40);

      // Accent
      ctx.fillStyle = cfg.muted;
      ctx.font = '14px sans-serif';
      ctx.fillText(v.accent, vx + 76, vy + 62);

      // Best for
      ctx.fillStyle = cfg.text;
      ctx.font = '15px sans-serif';
      ctx.fillText(v.best, vx + 20, vy + 110);

      // Play button
      ctx.fillStyle = cfg.accent;
      ctx.beginPath();
      ctx.arc(vx + colW - 30, vy + 45, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cfg.bg;
      ctx.beginPath();
      ctx.moveTo(vx + colW - 35, vy + 36);
      ctx.lineTo(vx + colW - 35, vy + 54);
      ctx.lineTo(vx + colW - 20, vy + 45);
      ctx.fill();
    });

    // Tuning hint
    ctx.fillStyle = cfg.muted;
    ctx.font = '15px sans-serif';
    ctx.fillText('Tune with --rate "-10%" (slower) and --pitch "-4Hz" (deeper)', 70, contentY + 390);
  }

  // ── TRANSITIONS ──────────────────────────────────────────────────────
  if (vis.type === 'transitions') {
    const transitions = [
      { name: 'fade', cat: 'smooth', highlight: true },
      { name: 'dissolve', cat: 'smooth', highlight: true },
      { name: 'fadeblack', cat: 'smooth' },
      { name: 'wipeleft', cat: 'wipe', highlight: true },
      { name: 'wiperight', cat: 'wipe' },
      { name: 'wipeup', cat: 'wipe' },
      { name: 'smoothleft', cat: 'slide', highlight: true },
      { name: 'slidedown', cat: 'slide' },
      { name: 'circleopen', cat: 'creative', highlight: true },
      { name: 'radial', cat: 'creative' },
      { name: 'zoomin', cat: 'zoom', highlight: true },
      { name: 'pixelize', cat: 'creative' },
      { name: 'diagbr', cat: 'wipe' },
      { name: 'horzopen', cat: 'wipe' },
      { name: 'squeezeh', cat: 'creative' },
      { name: 'coverright', cat: 'slide' },
      { name: 'revealup', cat: 'slide' },
      { name: 'fadewhite', cat: 'smooth' },
    ];

    let chipX = 70, chipY = contentY + 20;
    transitions.forEach(t => {
      ctx.font = '16px monospace';
      const tw = ctx.measureText(t.name).width + 28;
      if (chipX + tw > w - 70) { chipX = 70; chipY += 54; }

      ctx.fillStyle = t.highlight ? cfg.accent + '20' : '#0a0a0a';
      ctx.beginPath();
      ctx.roundRect(chipX, chipY, tw, 40, 10);
      ctx.fill();
      ctx.strokeStyle = t.highlight ? cfg.accent : cfg.accent + '20';
      ctx.lineWidth = t.highlight ? 2 : 1;
      ctx.stroke();

      ctx.fillStyle = t.highlight ? cfg.accent : cfg.muted;
      ctx.fillText(t.name, chipX + 14, chipY + 27);

      chipX += tw + 12;
    });

    // Command hint
    ctx.fillStyle = cfg.muted;
    ctx.font = '15px sans-serif';
    ctx.fillText('45+ transitions available — run npx s2v transitions for the full list', 70, chipY + 80);
  }

  // ── MUSIC ────────────────────────────────────────────────────────────
  if (vis.type === 'music') {
    const presets = [
      { name: 'ambient', desc: 'Warm pad', color: '#38bdf8' },
      { name: 'upbeat', desc: 'Rhythmic', color: '#f59e0b' },
      { name: 'corporate', desc: 'Neutral', color: '#94a3b8' },
      { name: 'lofi', desc: 'Mellow', color: '#a78bfa' },
      { name: 'minimal', desc: 'Subtle', color: '#6b7280' },
      { name: 'calm', desc: 'Gentle', color: '#34d399' },
    ];
    const cardW2 = Math.floor((w - 180) / 3);
    presets.forEach((p, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const px = 70 + col * (cardW2 + 20);
      const py = contentY + 10 + row * 170;

      ctx.fillStyle = p.color + '12';
      ctx.beginPath();
      ctx.roundRect(px, py, cardW2, 140, 12);
      ctx.fill();
      ctx.strokeStyle = p.color + '30';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Waveform decoration
      ctx.strokeStyle = p.color + '60';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < cardW2 - 40; x += 4) {
        const amp = Math.sin(x * 0.08 + i * 2) * 15 + Math.sin(x * 0.15) * 8;
        const wx = px + 20 + x;
        const wy = py + 50 + amp;
        x === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
      }
      ctx.stroke();

      // Name
      ctx.fillStyle = p.color;
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(p.name, px + 20, py + 100);

      // Description
      ctx.fillStyle = cfg.muted;
      ctx.font = '15px sans-serif';
      ctx.fillText(p.desc, px + 20, py + 124);
    });

    ctx.fillStyle = cfg.muted;
    ctx.font = '15px sans-serif';
    ctx.fillText('Or bring your own: --music ~/track.mp3 --music-volume 0.2', 70, contentY + 380);
  }

  // ── BROWSER ──────────────────────────────────────────────────────────
  if (vis.type === 'browser') {
    // Browser chrome
    const bx = 70, by = contentY, bw = w - 140, bh = 480;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 14);
    ctx.fill();
    ctx.strokeStyle = cfg.accent + '20';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Browser title bar
    ctx.fillStyle = '#0f0f23';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, 40, [14, 14, 0, 0]);
    ctx.fill();

    // Traffic lights
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(bx + 20 + i * 22, by + 20, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // URL bar
    ctx.fillStyle = '#2a2a4a';
    ctx.beginPath();
    ctx.roundRect(bx + 100, by + 8, bw - 140, 24, 6);
    ctx.fill();
    ctx.fillStyle = cfg.muted;
    ctx.font = '12px sans-serif';
    ctx.fillText('localhost:3456', bx + 112, by + 24);

    // Tab buttons
    const tabs = ['Voices', 'Music', 'Transitions'];
    tabs.forEach((tab, i) => {
      const tx = bx + 60 + i * 160;
      ctx.fillStyle = i === 0 ? cfg.accent : cfg.accent + '30';
      ctx.beginPath();
      ctx.roundRect(tx, by + 56, 130, 36, 8);
      ctx.fill();
      ctx.fillStyle = i === 0 ? cfg.bg : cfg.text;
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(tab, tx + 30, by + 80);
    });

    // Voice preview rows
    const voicePreview = ['en-GB-RyanNeural', 'en-US-JennyNeural', 'en-US-GuyNeural'];
    voicePreview.forEach((v, i) => {
      const ry = by + 110 + i * 60;
      ctx.fillStyle = i === 0 ? cfg.accent + '15' : 'transparent';
      ctx.fillRect(bx + 20, ry, bw - 40, 50);

      ctx.fillStyle = '#34d399';
      ctx.font = '15px monospace';
      ctx.fillText(v, bx + 40, ry + 30);

      // Play button
      ctx.fillStyle = cfg.accent;
      ctx.beginPath();
      ctx.roundRect(bx + bw - 120, ry + 10, 70, 30, 6);
      ctx.fill();
      ctx.fillStyle = cfg.bg;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('Play ▶', bx + bw - 108, ry + 31);
    });

    // Audio player bar
    ctx.fillStyle = cfg.accent + '20';
    ctx.beginPath();
    ctx.roundRect(bx + 20, by + bh - 60, bw - 40, 40, 8);
    ctx.fill();
    ctx.fillStyle = cfg.accent;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('▶  en-GB-RyanNeural (-5%, -2Hz)', bx + 40, by + bh - 34);
    // Progress bar
    ctx.fillStyle = cfg.accent + '30';
    ctx.beginPath();
    ctx.roundRect(bx + 340, by + bh - 48, bw - 400, 6, 3);
    ctx.fill();
    ctx.fillStyle = cfg.accent;
    ctx.beginPath();
    ctx.roundRect(bx + 340, by + bh - 48, (bw - 400) * 0.6, 6, 3);
    ctx.fill();
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
