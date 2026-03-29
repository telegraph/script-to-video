/**
 * Browse command — launches a local web UI for previewing voices, music
 * presets, and transitions before committing to them in your project.
 *
 * Usage: s2v browse [--port 3456]
 */

const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const { RECOMMENDED } = require('./voices');
const { PRESETS } = require('./music');
const { TRANSITIONS } = require('./transitions');

const SAMPLE_TEXT = 'This is a sample of the voice you selected. It demonstrates the tone, pace, and clarity you can expect in your final narrated video.';

function buildHtml() {
  const voiceRows = Object.entries(RECOMMENDED).map(([name, v]) => `
    <tr>
      <td class="voice-name">${name}</td>
      <td>${v.gender}</td>
      <td>${v.lang}</td>
      <td class="note">${v.note}</td>
      <td><button class="btn-play" onclick="playVoice('${name}')">Play</button></td>
    </tr>`).join('');

  const musicCards = Object.entries(PRESETS).map(([key, p]) => `
    <div class="card">
      <h3>${p.name}</h3>
      <p>${p.description}</p>
      <code>background_music: ${key}</code>
      <button class="btn-play" onclick="playMusic('${key}')">Preview</button>
    </div>`).join('');

  const transitionGroups = {};
  TRANSITIONS.forEach(t => {
    if (!transitionGroups[t.category]) transitionGroups[t.category] = [];
    transitionGroups[t.category].push(t);
  });
  const transitionHtml = Object.entries(transitionGroups).map(([cat, items]) => `
    <div class="transition-group">
      <h3>${cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
      ${items.map(t => `<span class="transition-chip${t.name === 'fade' ? ' default' : ''}" title="${t.desc}">${t.name}</span>`).join('')}
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>s2v browse — Voice, Music & Transition Preview</title>
  <style>
    :root { --bg: #0f172a; --surface: #1e293b; --border: #334155; --text: #f8fafc;
            --muted: #94a3b8; --accent: #38bdf8; --green: #34d399; --purple: #a78bfa; --amber: #fbbf24; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: var(--bg); color: var(--text); }
    .container { max-width: 1100px; margin: 0 auto; padding: 24px; }

    header { text-align: center; padding: 40px 0 20px; border-bottom: 1px solid var(--border); margin-bottom: 40px; }
    header h1 { font-size: 2rem; }
    header h1 span { color: var(--accent); }
    header p { color: var(--muted); margin-top: 8px; }

    nav { display: flex; gap: 12px; justify-content: center; margin-bottom: 40px; }
    nav button { background: var(--surface); border: 1px solid var(--border); color: var(--text);
                 padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 0.95rem; }
    nav button.active { background: var(--accent); color: var(--bg); border-color: var(--accent); font-weight: 600; }
    nav button:hover { border-color: var(--accent); }

    .tab { display: none; }
    .tab.active { display: block; }

    h2 { margin-bottom: 16px; font-size: 1.4rem; }
    h2 span { color: var(--accent); font-weight: 400; }

    /* Voice table */
    table { width: 100%; border-collapse: collapse; background: var(--surface); border-radius: 12px; overflow: hidden; }
    th { text-align: left; padding: 12px 16px; background: var(--bg); color: var(--accent);
         font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 10px 16px; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
    tr:last-child td { border-bottom: none; }
    .voice-name { font-family: monospace; color: var(--green); }
    .note { color: var(--muted); font-size: 0.85rem; }

    /* Tuning controls */
    .tuning { display: flex; gap: 20px; margin: 20px 0; padding: 16px; background: var(--surface);
              border: 1px solid var(--border); border-radius: 8px; align-items: center; flex-wrap: wrap; }
    .tuning label { color: var(--muted); font-size: 0.85rem; }
    .tuning input, .tuning select { background: var(--bg); border: 1px solid var(--border); color: var(--text);
                                     padding: 6px 12px; border-radius: 6px; font-size: 0.9rem; }
    .tuning input[type=range] { width: 150px; }

    /* Buttons */
    .btn-play { background: var(--accent); color: var(--bg); border: none; padding: 6px 16px;
                border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
    .btn-play:hover { opacity: 0.85; }
    .btn-play:disabled { opacity: 0.5; cursor: wait; }
    .btn-play.playing { background: var(--amber); }

    /* Music cards */
    .music-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .card h3 { margin-bottom: 8px; }
    .card p { color: var(--muted); font-size: 0.9rem; margin-bottom: 12px; }
    .card code { display: block; background: var(--bg); padding: 8px 12px; border-radius: 6px;
                 font-size: 0.8rem; color: var(--green); margin-bottom: 12px; }

    /* Transitions */
    .transition-group { margin-bottom: 20px; }
    .transition-group h3 { color: var(--accent); font-size: 1rem; margin-bottom: 8px; text-transform: uppercase; }
    .transition-chip { display: inline-block; padding: 6px 14px; margin: 3px; border-radius: 6px;
                       background: var(--surface); border: 1px solid var(--border); font-size: 0.85rem;
                       font-family: monospace; cursor: default; }
    .transition-chip:hover { border-color: var(--accent); }
    .transition-chip.default { border-color: var(--green); color: var(--green); }

    /* Audio player area */
    #player-status { margin-top: 16px; padding: 12px 16px; background: var(--surface);
                     border: 1px solid var(--border); border-radius: 8px; display: none; }
    #player-status.visible { display: flex; align-items: center; gap: 12px; }
    #player-status audio { flex: 1; }
    #player-label { color: var(--accent); font-weight: 600; font-size: 0.9rem; white-space: nowrap; }

    footer { text-align: center; padding: 40px 0 20px; color: var(--muted); font-size: 0.85rem;
             border-top: 1px solid var(--border); margin-top: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1><span>s2v</span> browse</h1>
      <p>Preview voices, background music, and transitions before building your video</p>
    </header>

    <nav>
      <button class="active" onclick="showTab('voices')">Voices</button>
      <button onclick="showTab('music')">Background Music</button>
      <button onclick="showTab('transitions')">Transitions</button>
    </nav>

    <div id="player-status">
      <span id="player-label">Loading…</span>
      <audio id="audio-player" controls></audio>
    </div>

    <!-- Voices Tab -->
    <div id="tab-voices" class="tab active">
      <h2>TTS Voices <span>(${Object.keys(RECOMMENDED).length} recommended)</span></h2>
      <div class="tuning">
        <label>Rate: <input type="range" id="voice-rate" min="-20" max="20" value="-5" oninput="document.getElementById('rate-val').textContent=this.value+'%'"> <span id="rate-val">-5%</span></label>
        <label>Pitch: <input type="range" id="voice-pitch" min="-6" max="6" value="-2" oninput="document.getElementById('pitch-val').textContent=this.value+'Hz'"> <span id="pitch-val">-2Hz</span></label>
        <label>Sample text: <input type="text" id="voice-text" value="${SAMPLE_TEXT}" style="width:300px"></label>
      </div>
      <table>
        <thead><tr><th>Voice</th><th>Gender</th><th>Language</th><th>Notes</th><th>Preview</th></tr></thead>
        <tbody>${voiceRows}</tbody>
      </table>
    </div>

    <!-- Music Tab -->
    <div id="tab-music" class="tab">
      <h2>Background Music <span>(${Object.keys(PRESETS).length} presets)</span></h2>
      <p style="color:var(--muted);margin-bottom:20px">Generated using FFmpeg audio synthesis. No external files or licences needed.</p>
      <div class="music-grid">${musicCards}</div>
    </div>

    <!-- Transitions Tab -->
    <div id="tab-transitions" class="tab">
      <h2>Slide Transitions <span>(${TRANSITIONS.length} types)</span></h2>
      <p style="color:var(--muted);margin-bottom:20px">Set in demo.yaml: <code style="background:var(--surface);padding:2px 8px;border-radius:4px">transition: wipeleft</code></p>
      ${transitionHtml}
    </div>

    <footer>
      <p>script-to-video &middot; <code>s2v browse</code> &middot; Close this tab and press Ctrl+C in terminal to stop</p>
    </footer>
  </div>

  <script>
    function showTab(name) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
      document.getElementById('tab-' + name).classList.add('active');
      event.target.classList.add('active');
    }

    function setPlayerStatus(label, show) {
      const el = document.getElementById('player-status');
      document.getElementById('player-label').textContent = label;
      el.classList.toggle('visible', show);
    }

    async function playVoice(name) {
      const rate = document.getElementById('voice-rate').value;
      const pitch = document.getElementById('voice-pitch').value;
      const text = document.getElementById('voice-text').value;
      const rateStr = (rate >= 0 ? '+' : '') + rate + '%';
      const pitchStr = (pitch >= 0 ? '+' : '') + pitch + 'Hz';

      setPlayerStatus('Generating ' + name + '…', true);

      try {
        const res = await fetch('/api/voice-sample?voice=' + encodeURIComponent(name) +
          '&rate=' + encodeURIComponent(rateStr) +
          '&pitch=' + encodeURIComponent(pitchStr) +
          '&text=' + encodeURIComponent(text));

        if (!res.ok) throw new Error(await res.text());

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const player = document.getElementById('audio-player');
        player.src = url;
        player.play();
        setPlayerStatus(name + ' (' + rateStr + ', ' + pitchStr + ')', true);
      } catch (err) {
        setPlayerStatus('Error: ' + err.message, true);
      }
    }

    async function playMusic(preset) {
      setPlayerStatus('Generating ' + preset + ' preview…', true);

      try {
        const res = await fetch('/api/music-sample?preset=' + encodeURIComponent(preset));
        if (!res.ok) throw new Error(await res.text());

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const player = document.getElementById('audio-player');
        player.src = url;
        player.play();
        setPlayerStatus(preset + ' music preview', true);
      } catch (err) {
        setPlayerStatus('Error: ' + err.message, true);
      }
    }
  </script>
</body>
</html>`;
}

/**
 * Start the browse server.
 */
async function browse(opts = {}) {
  const port = opts.port || 3456;
  const tmpDir = path.join(os.tmpdir(), 's2v-browse');
  fs.mkdirSync(tmpDir, { recursive: true });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(buildHtml());
      return;
    }

    // Voice sample API
    if (url.pathname === '/api/voice-sample') {
      const voice = url.searchParams.get('voice') || 'en-GB-RyanNeural';
      const rate = url.searchParams.get('rate') || '-5%';
      const pitch = url.searchParams.get('pitch') || '-2Hz';
      const text = url.searchParams.get('text') || SAMPLE_TEXT;

      const outPath = path.join(tmpDir, `voice-${voice}-${Date.now()}.mp3`);

      try {
        execSync(
          `edge-tts --voice "${voice}" --rate="${rate}" --pitch="${pitch}" ` +
          `--text "${text.replace(/"/g, '\\"')}" --write-media "${outPath}"`,
          { stdio: 'pipe', timeout: 30000 }
        );

        const data = fs.readFileSync(outPath);
        res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': data.length });
        res.end(data);

        // Cleanup
        setTimeout(() => fs.unlinkSync(outPath), 5000);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Failed to generate voice sample: ' + err.message);
      }
      return;
    }

    // Music sample API
    if (url.pathname === '/api/music-sample') {
      const preset = url.searchParams.get('preset') || 'ambient';
      const outPath = path.join(tmpDir, `music-${preset}-${Date.now()}.wav`);

      try {
        const { generateMusic } = require('./music');
        generateMusic(preset, outPath, 15);

        const data = fs.readFileSync(outPath);
        res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': data.length });
        res.end(data);

        setTimeout(() => fs.unlinkSync(outPath), 5000);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Failed to generate music sample: ' + err.message);
      }
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(chalk.bold(`\n  s2v browse is running at ${chalk.accent ? url : chalk.blue(url)}\n`));
    console.log(chalk.dim('  Preview voices, background music, and transitions in your browser.'));
    console.log(chalk.dim('  Press Ctrl+C to stop.\n'));

    // Open browser
    try {
      const openCmd = process.platform === 'darwin' ? 'open' :
                      process.platform === 'win32' ? 'start' : 'xdg-open';
      execSync(`${openCmd} ${url}`, { stdio: 'pipe' });
    } catch {
      // Browser didn't open, that's fine
    }
  });
}

module.exports = { browse };
