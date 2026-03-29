/**
 * Init command — scaffolds a new script-to-video project directory
 * with template files ready to fill in.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const yaml = require('js-yaml');

async function init(name, opts = {}) {
  const projectName = name || 'my-video';
  const projectDir = path.join(process.cwd(), projectName);

  if (fs.existsSync(projectDir)) {
    console.log(chalk.red(`\n  Directory already exists: ${projectName}`));
    console.log(chalk.dim('  Choose a different name or delete the existing directory.\n'));
    process.exit(1);
  }

  const voice = opts.voice || 'en-GB-RyanNeural';
  const resolution = opts.resolution || '1680x1050';
  const source = opts.source || 'directory';

  // Create directory structure
  fs.mkdirSync(path.join(projectDir, 'slides'), { recursive: true });
  fs.mkdirSync(path.join(projectDir, 'output'), { recursive: true });

  // demo.yaml
  const config = {
    name: projectName,
    resolution,
    voice,
    rate: '-5%',
    pitch: '-2Hz',
    transition: 'fade',
    transition_duration: 0.4,
    tail_silence: 3.0,
    crf: 20,
    slides_source: source,
    narration: 'narration.txt',
    callouts: 'callouts.json',
  };

  if (source === 'pptx') {
    config.slides_file = 'presentation.pptx';
  }
  if (source === 'google-slides') {
    config.slides_id = 'YOUR_GOOGLE_SLIDES_ID_HERE';
  }

  fs.writeFileSync(
    path.join(projectDir, 'demo.yaml'),
    yaml.dump(config, { lineWidth: 120, quotingType: '"' })
  );

  // narration.txt
  fs.writeFileSync(
    path.join(projectDir, 'narration.txt'),
    `Welcome to ${projectName}. This is your title slide. Add a brief introduction here that sets the stage for your audience.

This is slide two. Each paragraph in this file becomes one slide in your video. The text-to-speech engine will read this paragraph while slide-01.png is displayed.

Write your narration naturally, as if you were presenting to a colleague. Avoid abbreviations like APIs or PRs — spell them out for clearer speech synthesis.

This is the final slide. Summarise your key points and end with a clear call to action. The video will hold on this slide for a few extra seconds before ending.
`
  );

  // callouts.json
  fs.writeFileSync(
    path.join(projectDir, 'callouts.json'),
    JSON.stringify([
      {
        slide: 0,
        label: 'Title',
        x: 100,
        y: 100,
        w: 400,
        h: 60,
      },
    ], null, 2) + '\n'
  );

  // .gitignore
  fs.writeFileSync(
    path.join(projectDir, '.gitignore'),
    `output/chunks/
output/slides-annotated/
output/build-video.sh
output/*.mp4
output/*.srt
output/*.vtt
output/*-thumb.png
`
  );

  console.log(chalk.bold(`\n  Scaffolded: ${projectName}/\n`));
  console.log('  Created:');
  console.log(chalk.green('    demo.yaml          ') + chalk.dim('← video configuration'));
  console.log(chalk.green('    narration.txt      ') + chalk.dim('← your script (edit this!)'));
  console.log(chalk.green('    callouts.json      ') + chalk.dim('← optional highlight annotations'));
  console.log(chalk.green('    slides/            ') + chalk.dim('← drop your PNGs here'));
  console.log(chalk.green('    output/            ') + chalk.dim('← generated files go here'));
  console.log(chalk.green('    .gitignore         ') + chalk.dim('← ignores generated artifacts'));

  console.log(chalk.bold('\n  Next steps:\n'));

  if (source === 'directory') {
    console.log('  1. Drop your slide PNGs into slides/ as slide-00.png, slide-01.png, …');
  } else if (source === 'pptx') {
    console.log('  1. Place your .pptx file in the project directory');
    console.log('     Then run: s2v import');
  } else if (source === 'google-slides') {
    console.log('  1. Update slides_id in demo.yaml with your Google Slides ID');
    console.log('     Then run: s2v import');
  }

  console.log('  2. Edit narration.txt — one paragraph per slide');
  console.log('  3. Run: s2v build');
  console.log('  4. Find your video in output/\n');

  console.log(chalk.dim('  Tip: run "s2v voices" to browse available TTS voices'));
  console.log(chalk.dim('  Tip: run "s2v transitions" to see all transition effects\n'));
}

module.exports = { init };
