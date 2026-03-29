/**
 * from-doc — Create a video project from a Google Doc or Drive folder.
 *
 * All Google API access uses authenticated calls via:
 *   - GOOGLE_APPLICATION_CREDENTIALS (service account JSON) — recommended
 *   - GOOGLE_API_KEY (API key with Docs/Drive/Slides scope)
 *
 * Public/unauthenticated access is NOT supported — all docs stay private.
 *
 * Flows:
 *   s2v from-doc <google-doc-url>                               → pulls text as narration
 *   s2v from-doc <google-doc-url> --slides <drive-folder-url>   → pulls both
 *   s2v from-doc <google-doc-url> --slides ./my-slides/         → doc + local slides
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const yaml = require('js-yaml');

/**
 * Extract Google Doc/Slides/Drive ID from various URL formats.
 */
function extractDocId(url) {
  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return { type: 'doc', id: docMatch[1] };

  const presMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (presMatch) return { type: 'slides', id: presMatch[1] };

  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return { type: 'folder', id: folderMatch[1] };

  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) return { type: 'doc', id: url };

  throw new Error('Could not extract Google Doc/Drive ID from URL');
}

/**
 * Create an authenticated Google API client.
 * Supports service account (GOOGLE_APPLICATION_CREDENTIALS) or API key (GOOGLE_API_KEY).
 */
function getGoogleAuth(scopes) {
  const { google } = require('googleapis');

  // Option 1: ADC — works with gcloud auth application-default login (easiest for developers)
  // Also picks up GOOGLE_APPLICATION_CREDENTIALS if set (service accounts, CI/CD)
  // GoogleAuth automatically checks ADC locations:
  //   1. GOOGLE_APPLICATION_CREDENTIALS env var (service account JSON)
  //   2. ~/.config/gcloud/application_default_credentials.json (gcloud ADC)
  //   3. GCE/Cloud Run metadata server (when running on GCP)
  try {
    return new google.auth.GoogleAuth({ scopes });
  } catch {
    // Fall through to API key or error
  }

  // Option 2: API key
  if (process.env.GOOGLE_API_KEY) {
    return process.env.GOOGLE_API_KEY;
  }

  throw new Error(
    'Google authentication required.\n\n' +
    '  Option 1 (easiest): Application Default Credentials\n' +
    '    gcloud auth application-default login\n' +
    '    This opens your browser to authenticate with your Google account.\n\n' +
    '  Option 2: Service account (CI/CD, shared environments)\n' +
    '    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"\n' +
    '    Share the doc/folder with the service account email.\n\n' +
    '  Option 3: API key\n' +
    '    export GOOGLE_API_KEY="your-api-key"\n' +
    '    The key must have Google Docs/Drive/Slides API enabled.\n\n' +
    '  See docs/AGENT_INTEGRATION.md for setup details.'
  );
}

/**
 * Fetch a Google Doc as plain text using the Docs API (authenticated).
 */
async function fetchDocAsText(docId) {
  const { google } = require('googleapis');
  const auth = getGoogleAuth([
    'https://www.googleapis.com/auth/documents.readonly',
  ]);

  const docs = google.docs({ version: 'v1', auth });

  console.log(chalk.dim('  Authenticating with Google Docs API…'));

  const res = await docs.documents.get({ documentId: docId });
  const doc = res.data;

  // Extract plain text from the document body
  let text = '';
  if (doc.body && doc.body.content) {
    for (const element of doc.body.content) {
      if (element.paragraph) {
        const line = element.paragraph.elements
          .map(e => (e.textRun && e.textRun.content) || '')
          .join('');
        text += line;
      }
    }
  }

  if (!text.trim()) {
    throw new Error('Google Doc appears to be empty');
  }

  return text;
}

/**
 * Fetch images from a Google Drive folder (authenticated).
 */
async function fetchDriveImages(folderId, outDir) {
  const { google } = require('googleapis');
  const auth = getGoogleAuth([
    'https://www.googleapis.com/auth/drive.readonly',
  ]);

  const drive = google.drive({ version: 'v3', auth });

  console.log(chalk.dim('  Authenticating with Google Drive API…'));

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
    console.log('  Authentication (all access is private, no public sharing needed):');
    console.log(chalk.dim('    gcloud auth application-default login        # easiest — opens browser'));
    console.log(chalk.dim('    # OR export GOOGLE_APPLICATION_CREDENTIALS   # service account for CI/CD\n'));
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
    console.log(chalk.blue('  Fetching Google Doc (authenticated)…'));
    const text = await fetchDocAsText(parsed.id);
    const narrationPath = path.join(projectDir, 'narration.txt');
    fs.writeFileSync(narrationPath, text.trim() + '\n');
    const paragraphs = text.trim().split(/\n\n+/).filter(p => p.trim());
    console.log(chalk.green(`  + narration.txt (${paragraphs.length} paragraphs = ${paragraphs.length} slides)`));
  } else if (parsed.type === 'slides') {
    console.log(chalk.blue('  Detected Google Slides presentation'));
    console.log(chalk.dim('  Slides will be imported via s2v import'));
  }

  // Handle slides source
  if (opts.slides) {
    let slideParsed = null;
    try { slideParsed = extractDocId(opts.slides); } catch { /* not a URL */ }

    if (slideParsed && slideParsed.type === 'folder') {
      console.log(chalk.blue('  Fetching slides from Google Drive folder (authenticated)…'));
      await fetchDriveImages(slideParsed.id, path.join(projectDir, 'slides'));
    } else if (fs.existsSync(opts.slides) && fs.statSync(opts.slides).isDirectory()) {
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
