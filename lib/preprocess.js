/**
 * Narration preprocessor — splits narration.txt into chunks and applies
 * text transformations for better TTS output.
 *
 * Each paragraph (separated by blank lines) becomes one chunk = one slide.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Split narration text into paragraphs and apply TTS-friendly transformations.
 */
function preprocessText(raw, rules = {}) {
  const {
    colon_to_period = true,
    percent_to_word = true,
    ensure_trailing_period = true,
  } = rules;

  const paragraphs = raw.trim().split(/\n\n+/).filter(p => p.trim());

  return paragraphs.map(p => {
    let text = p.trim();

    // Replace ": " followed by uppercase → ". " (reads colons as pauses)
    if (colon_to_period) {
      text = text.replace(/:\s+([A-Z])/g, '. $1');
    }

    // Replace "42%" → "42 percent" (TTS reads % poorly)
    if (percent_to_word) {
      text = text.replace(/\b(\d+)%/g, '$1 percent');
    }

    // Ensure chunk ends with punctuation
    if (ensure_trailing_period) {
      text = text.replace(/([a-zA-Z0-9])\s*$/, '$1.');
    }

    return text;
  });
}

/**
 * Write preprocessed chunks to output/chunks/p00.txt, p01.txt, etc.
 */
function writeChunks(chunks, chunksDir) {
  fs.mkdirSync(chunksDir, { recursive: true });

  chunks.forEach((text, i) => {
    const filename = `p${String(i).padStart(2, '0')}.txt`;
    fs.writeFileSync(path.join(chunksDir, filename), text);
  });

  console.log(chalk.green(`  ${chunks.length} chunks written`));
  return chunks.length;
}

/**
 * Full preprocess step: read narration.txt → split → transform → write chunks.
 */
function preprocess(config) {
  const raw = fs.readFileSync(config.narrationPath, 'utf-8');
  const chunks = preprocessText(raw, config.preprocess || {});
  writeChunks(chunks, config.chunksDir);
  return chunks;
}

module.exports = { preprocess, preprocessText, writeChunks };
