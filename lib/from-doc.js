/**
 * from-doc — Create a video project from a Google Doc or Drive folder.
 *
 * Flows:
 *   s2v from-doc <google-doc-url>              → pulls text as narration
 *   s2v from-doc <google-doc-url> --slides <drive-folder-url>  → pulls both
 *   s2v from-doc <google-doc-url> --slides ./my-slides/        → doc + local slides
 *
 * The Google Doc becomes narration.txt (paragraphs = slides).
 * The Drive folder images become slide-00.png, slide-01.png, etc.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const chalk = require('chalk');
const yaml = require('js-yaml');

/**
 * Extract Google Doc ID from various URL formats.
 */
function extractDocId(url) {
  // https://docs.google.com/document/d/DOC_ID/edit
  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return { type: 'doc', id: docMatch[1] };

  // https://docs.google.com/presentation/d/PRES_ID/edit
  const presMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (presMatch) return { type: 'slides', id: presMatch[1] };

  // https://drive.google.com/drive/folders/FOLDER_ID
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return { type: 'folder', id: folderMatch[1] };

  // Raw ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) return { type: 'doc', id: url };

  throw new Error('Could not extract Google Doc/Drive ID from URL');
}

/**
 * Download a file from a URL to a local path.
 */
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (reqUrl) => {
      https.get(reqUrl, response => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          request(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode} downloading ${reqUrl}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', reject);
    };
    request(url);
  });
}

/**
 * Fetch a Google Doc as plain text.
 */
async function fetchDocAsText(docId) {
  // Export as plain text via the public export URL
  // Requires the doc to be shared as "Anyone with the link can view"
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
  const tmpPath = path.join(require('os').tmpdir(), `s2v-doc-${Date.now()}.txt`);

  try {
    await download(exportUrl, tmpPath);
    const text = fs.readFileSync(tmpPath, 'utf-8');
    fs.unlinkSync(tmpPath);
    return text;
  } catch (err) {
    throw new Error(
      `Failed to fetch Google Doc. Make sure it's shared as "Anyone with the link can view".\n` +
      `  URL: https://docs.google.com/document/d/${docId}/edit\n` +
      `  Error: ${err.message}`
    );
  }
}

/**
 * Fetch images from a Google Drive folder.
 * Requires googleapis and authentication.
 */
async function fetchDriveImages(folderId, outDir) {
  const { google } = require('googleapis');

  let auth;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
  } else if (process.env.GOOGLE_API_KEY) {
    auth = process.env.GOOGLE_API_KEY;
  } else {
    throw new Error(
      'Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_API_KEY to access Drive folders.'
    );
  }

  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.list({
    q: `'${folderId}' in parents and (mimeType contains 'image/')`,
    orderBy: 'name',
    fields: 'files(id, name, mimeType)',
  });

  const files = res.data.files || [];
  if (files.length === 0) throw new Error('No images found in Drive folder');

  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < files.length; i++) {
    const dest = path.join(outDir, `slide-${String(i).padStart(2, '0')}.png`);
    const fileRes = await drive.files.get(
      { fileId: files[i].id, alt: 'media' },
      { responseType: 'stream' }
    );
    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(dest);
      fileRes.data.pipe(ws);
      ws.on('finish', resolve);
      ws.on('error', reject);
    });
    console.log(chalk.green(`  + slide-${String(i).padStart(2, '0')}.png (${files[i].name})`));
  }

  return files.length;
}

/**
 * Main from-doc command handler.
 */
async function fromDoc(url, opts = {}) {
  if (!url) {
    console.log(chalk.bold('\n  s2v from-doc — create a video from a Google Doc\n'));
    console.log('  Usage:');
    console.log(chalk.dim('    s2v from-doc <google-doc-url>'));
    console.log(chalk.dim('    s2v from-doc <google-doc-url> --slides <drive-folder-url>'));
    console.log(chalk.dim('    s2v from-doc <google-doc-url> --slides ./my-slides/'));
    console.log(chalk.dim('    s2v from-doc <google-doc-url> --name my-video --voice en-US-JennyNeural\n'));
    console.log('  The Google Doc must be shared as "Anyone with the link can view".');
    console.log('  Each paragraph in the doc becomes one slide in the video.\n');
    return;
  }

  const parsed = extractDocId(url);
  const projectName = opts.name || 'from-doc-video';
  const projectDir = path.join(process.cwd(), projectName);

  console.log(chalk.bold(`\n  Creating video project from Google Doc…\n`));

  // Create project directory
  fs.mkdirSync(path.join(projectDir, 'slides'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'output'), { recursive: true });

  // Fetch narration from Google Doc
  if (parsed.type === 'doc') {
    console.log(chalk.blue('  Fetching Google Doc…'));
    const text = await fetchDocAsText(parsed.id);
    const narrationPath = path.join(projectDir, 'narration.txt');
    fs.writeFileSync(narrationPath, text.trim() + '\n');
    const paragraphs = text.trim().split(/\n\n+/).filter(p => p.trim());
    console.log(chalk.green(`  + narration.txt (${paragraphs.length} paragraphs = ${paragraphs.length} slides)`));
  } else if (parsed.type === 'slides') {
    // Google Slides — set up for slide import
    console.log(chalk.blue('  Detected Google Slides presentation'));
    console.log(chalk.dim('  Slides will be imported via s2v import'));
  }

  // Handle slides source
  if (opts.slides) {
    const slideParsed = extractDocId(opts.slides).catch ? null : extractDocId(opts.slides);
    if (slideParsed && slideParsed.type === 'folder') {
      console.log(chalk.blue('  Fetching slides from Google Drive folder…'));
      await fetchDriveImages(slideParsed.id, path.join(projectDir, 'slides'));
    } else if (fs.existsSync(opts.slides) && fs.statSync(opts.slides).isDirectory()) {
      // Local directory — copy slides
      console.log(chalk.blue('  Copying slides from local directory…'));
      const files = fs.readdirSync(opts.slides)
        .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
        .sort();
      files.forEach((f, i) => {
        fs.copyFileSync(
          path.join(opts.slides, f),
          path.join(projectDir, 'slides', `slide-${String(i).padStart(2, '0')}.png`)
        );
      });
      console.log(chalk.green(`  + ${files.length} slides copied`));
    } else {
      console.log(chalk.yellow(`  Slides path not found: ${opts.slides}`));
      console.log(chalk.dim('  Add slides manually to ' + path.join(projectDir, 'slides/')));
    }
  }

  // Write demo.yaml
  const config = {
    name: projectName,
    resolution: '1920x1080',
    voice: opts.voice || 'en-GB-RyanNeural',
    rate: '-5%',
    pitch: '-2Hz',
    transition: opts.transition || 'fade',
    transition_duration: 0.4,
    tail_silence: 3.0,
    crf: 20,
    slides_source: parsed.type === 'slides' ? 'google-slides' : 'directory',
  };

  if (parsed.type === 'slides') {
    config.slides_id = parsed.id;
  }
  if (opts.music) {
    config.background_music = opts.music;
    config.music_volume = opts.musicVolume || 0.15;
  }

  fs.writeFileSync(
    path.join(projectDir, 'demo.yaml'),
    yaml.dump(config, { lineWidth: 120, quotingType: '"' })
  );
  console.log(chalk.green('  + demo.yaml'));

  // Summary
  const narrationPath = path.join(projectDir, 'narration.txt');
  const hasNarration = fs.existsSync(narrationPath);
  const slideFiles = fs.existsSync(path.join(projectDir, 'slides'))
    ? fs.readdirSync(path.join(projectDir, 'slides')).filter(f => f.endsWith('.png'))
    : [];

  console.log(chalk.bold(`\n  Project ready: ${projectName}/\n`));

  if (hasNarration && slideFiles.length > 0) {
    console.log(chalk.green('  Ready to build:'));
    console.log(chalk.dim(`    npx s2v build ${projectName}\n`));
  } else if (hasNarration && slideFiles.length === 0) {
    console.log(chalk.yellow('  Narration ready, but slides are missing.'));
    console.log(chalk.dim(`  Add ${path.join(projectName, 'slides/slide-00.png')}, slide-01.png, …`));
    console.log(chalk.dim(`  Then run: npx s2v build ${projectName}\n`));
  } else {
    console.log(chalk.dim(`  Add narration.txt and slides, then run: npx s2v build ${projectName}\n`));
  }
}

module.exports = { fromDoc, extractDocId, fetchDocAsText };
