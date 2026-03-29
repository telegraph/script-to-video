/**
 * Slide importer — converts slides from various sources into numbered PNGs.
 *
 * Supported sources:
 *   - "directory"      → copies and renames PNGs from a folder
 *   - "pptx"           → converts PowerPoint to PNGs via LibreOffice headless
 *   - "google-slides"  → exports slides as PNGs via Google Slides API
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadConfig } = require('./config');

/**
 * Import slides from a directory of existing PNGs.
 * Copies and renames them to slide-00.png, slide-01.png, etc.
 */
function importFromDirectory(config) {
  const sourceDir = config.sourceDir;
  const outDir = config.slidesDir;

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Slides directory not found: ${sourceDir}`);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(sourceDir)
    .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .sort();

  if (files.length === 0) {
    throw new Error(`No image files found in ${sourceDir}`);
  }

  for (let i = 0; i < files.length; i++) {
    const src = path.join(sourceDir, files[i]);
    const dest = path.join(outDir, `slide-${String(i).padStart(2, '0')}.png`);

    if (files[i].toLowerCase().endsWith('.png')) {
      fs.copyFileSync(src, dest);
    } else {
      // Convert non-PNG images to PNG using sharp
      const sharp = require('sharp');
      sharp(src).png().toFile(dest);
    }
  }

  console.log(chalk.green(`  ${files.length} slides imported from ${sourceDir}`));
  return files.length;
}

/**
 * Import slides from a PowerPoint file using LibreOffice headless.
 * Requires: libreoffice (soffice) installed.
 */
function importFromPptx(config) {
  const pptxPath = config.pptxPath;
  const outDir = config.slidesDir;

  if (!pptxPath || !fs.existsSync(pptxPath)) {
    throw new Error(`PowerPoint file not found: ${pptxPath}`);
  }

  // Check LibreOffice is available
  try {
    execSync('soffice --version', { stdio: 'pipe' });
  } catch {
    throw new Error(
      'LibreOffice (soffice) not found. Install it to convert PPTX files.\n' +
      '  macOS: brew install --cask libreoffice\n' +
      '  Ubuntu: sudo apt install libreoffice\n' +
      '  Windows: download from libreoffice.org'
    );
  }

  // Create a temp directory for LibreOffice output
  const tmpDir = path.join(config.outputDir, '_pptx-export');
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  // Export PPTX to PNG via LibreOffice
  console.log(chalk.blue(`  Converting ${path.basename(pptxPath)} to PNGs…`));
  execSync(
    `soffice --headless --convert-to png --outdir "${tmpDir}" "${pptxPath}"`,
    { stdio: 'pipe' }
  );

  // LibreOffice exports one PNG per slide but naming varies
  // Also try PDF-to-PNG approach if single PNG was generated
  const exported = fs.readdirSync(tmpDir)
    .filter(f => f.endsWith('.png'))
    .sort();

  if (exported.length === 0) {
    // Fallback: convert via PDF intermediate
    console.log(chalk.yellow('  Single-image export detected, trying PDF fallback…'));
    execSync(
      `soffice --headless --convert-to pdf --outdir "${tmpDir}" "${pptxPath}"`,
      { stdio: 'pipe' }
    );
    const pdfFile = fs.readdirSync(tmpDir).find(f => f.endsWith('.pdf'));
    if (pdfFile) {
      const pdfPath = path.join(tmpDir, pdfFile);
      // Use ffmpeg to extract frames from PDF
      execSync(
        `ffmpeg -y -i "${pdfPath}" "${tmpDir}/page-%02d.png"`,
        { stdio: 'pipe' }
      );
      const pages = fs.readdirSync(tmpDir)
        .filter(f => f.startsWith('page-') && f.endsWith('.png'))
        .sort();
      for (let i = 0; i < pages.length; i++) {
        fs.renameSync(
          path.join(tmpDir, pages[i]),
          path.join(outDir, `slide-${String(i).padStart(2, '0')}.png`)
        );
      }
      console.log(chalk.green(`  ${pages.length} slides extracted via PDF`));
      fs.rmSync(tmpDir, { recursive: true, force: true });
      return pages.length;
    }
    throw new Error('Failed to export slides from PowerPoint');
  }

  // Rename to standard slide-XX.png format
  for (let i = 0; i < exported.length; i++) {
    fs.renameSync(
      path.join(tmpDir, exported[i]),
      path.join(outDir, `slide-${String(i).padStart(2, '0')}.png`)
    );
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(chalk.green(`  ${exported.length} slides imported from PPTX`));
  return exported.length;
}

/**
 * Import slides from Google Slides via the Slides API.
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SLIDES_API_KEY env var.
 */
async function importFromGoogleSlides(config) {
  const slideId = config.slides_id;
  const outDir = config.slidesDir;

  if (!slideId) {
    throw new Error('slides_id is required in demo.yaml for google-slides source');
  }

  let apiKey = process.env.GOOGLE_SLIDES_API_KEY;
  let useServiceAccount = false;

  if (!apiKey && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    useServiceAccount = true;
  } else if (!apiKey) {
    throw new Error(
      'Set GOOGLE_SLIDES_API_KEY or GOOGLE_APPLICATION_CREDENTIALS to export Google Slides.\n' +
      'The presentation must be publicly accessible or shared with the service account.'
    );
  }

  fs.mkdirSync(outDir, { recursive: true });

  const { google } = require('googleapis');
  let auth;

  if (useServiceAccount) {
    auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/presentations.readonly'],
    });
  } else {
    auth = apiKey;
  }

  const slides = google.slides({ version: 'v1', auth });
  const presentation = await slides.presentations.get({ presentationId: slideId });
  const slideList = presentation.data.slides;

  console.log(chalk.blue(`  Exporting ${slideList.length} slides from Google Slides…`));

  // Export each slide as PNG via the thumbnail API
  for (let i = 0; i < slideList.length; i++) {
    const slideObjectId = slideList[i].objectId;
    const thumbnail = await slides.presentations.pages.getThumbnail({
      presentationId: slideId,
      pageObjectId: slideObjectId,
      'thumbnailProperties.mimeType': 'PNG',
      'thumbnailProperties.thumbnailSize': 'LARGE',
    });

    const imageUrl = thumbnail.data.contentUrl;
    const https = require('https');

    await new Promise((resolve, reject) => {
      const dest = path.join(outDir, `slide-${String(i).padStart(2, '0')}.png`);
      const file = fs.createWriteStream(dest);
      https.get(imageUrl, response => {
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', reject);
    });

    console.log(chalk.green(`  + slide-${String(i).padStart(2, '0')}`));
  }

  console.log(chalk.green(`  ${slideList.length} slides exported from Google Slides`));
  return slideList.length;
}

/**
 * Main import dispatcher — routes to the correct importer based on config.
 */
async function importSlides(dir, cliOpts = {}) {
  const config = loadConfig(dir, cliOpts);

  console.log(chalk.bold('\n  Importing slides…'));
  console.log(chalk.dim(`  Source: ${config.slides_source}`));

  switch (config.slides_source) {
    case 'directory':
      return importFromDirectory(config);
    case 'pptx':
      return importFromPptx(config);
    case 'google-slides':
      return await importFromGoogleSlides(config);
    default:
      throw new Error(`Unknown slides_source: ${config.slides_source}. Use "directory", "pptx", or "google-slides".`);
  }
}

module.exports = { importSlides, importFromDirectory, importFromPptx, importFromGoogleSlides };
