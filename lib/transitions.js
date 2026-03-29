/**
 * FFmpeg xfade transition gallery — lists all available transition types
 * with descriptions and recommended use cases.
 */

const chalk = require('chalk');

const TRANSITIONS = [
  { name: 'fade',          desc: 'Classic cross-fade (default)',                 category: 'smooth' },
  { name: 'fadeblack',     desc: 'Fade to black between slides',                category: 'smooth' },
  { name: 'fadewhite',     desc: 'Fade to white between slides',                category: 'smooth' },
  { name: 'dissolve',      desc: 'Gradual pixel dissolve',                      category: 'smooth' },
  { name: 'pixelize',      desc: 'Pixelation transition',                       category: 'creative' },
  { name: 'wipeleft',      desc: 'Wipe from right to left',                     category: 'wipe' },
  { name: 'wiperight',     desc: 'Wipe from left to right',                     category: 'wipe' },
  { name: 'wipeup',        desc: 'Wipe from bottom to top',                     category: 'wipe' },
  { name: 'wipedown',      desc: 'Wipe from top to bottom',                     category: 'wipe' },
  { name: 'slideleft',     desc: 'Slide new frame in from right',               category: 'slide' },
  { name: 'slideright',    desc: 'Slide new frame in from left',                category: 'slide' },
  { name: 'slideup',       desc: 'Slide new frame in from bottom',              category: 'slide' },
  { name: 'slidedown',     desc: 'Slide new frame in from top',                 category: 'slide' },
  { name: 'smoothleft',    desc: 'Smooth push from right to left',              category: 'slide' },
  { name: 'smoothright',   desc: 'Smooth push from left to right',              category: 'slide' },
  { name: 'smoothup',      desc: 'Smooth push from bottom to top',              category: 'slide' },
  { name: 'smoothdown',    desc: 'Smooth push from top to bottom',              category: 'slide' },
  { name: 'circlecrop',    desc: 'Circular reveal from centre',                 category: 'creative' },
  { name: 'circleclose',   desc: 'Circular close (iris wipe)',                  category: 'creative' },
  { name: 'circleopen',    desc: 'Circular open (iris reveal)',                 category: 'creative' },
  { name: 'rectcrop',      desc: 'Rectangular reveal from centre',              category: 'creative' },
  { name: 'horzclose',     desc: 'Horizontal barn-door close',                  category: 'wipe' },
  { name: 'horzopen',      desc: 'Horizontal barn-door open',                   category: 'wipe' },
  { name: 'vertclose',     desc: 'Vertical barn-door close',                    category: 'wipe' },
  { name: 'vertopen',      desc: 'Vertical barn-door open',                     category: 'wipe' },
  { name: 'diagbl',        desc: 'Diagonal wipe bottom-left',                   category: 'wipe' },
  { name: 'diagbr',        desc: 'Diagonal wipe bottom-right',                  category: 'wipe' },
  { name: 'diagtl',        desc: 'Diagonal wipe top-left',                      category: 'wipe' },
  { name: 'diagtr',        desc: 'Diagonal wipe top-right',                     category: 'wipe' },
  { name: 'hlslice',       desc: 'Horizontal line slice',                       category: 'creative' },
  { name: 'hrslice',       desc: 'Horizontal right slice',                      category: 'creative' },
  { name: 'vuslice',       desc: 'Vertical up slice',                           category: 'creative' },
  { name: 'vdslice',       desc: 'Vertical down slice',                         category: 'creative' },
  { name: 'radial',        desc: 'Radial clock-wipe',                           category: 'creative' },
  { name: 'zoomin',        desc: 'Zoom into next slide',                        category: 'zoom' },
  { name: 'squeezeh',      desc: 'Horizontal squeeze',                          category: 'creative' },
  { name: 'squeezev',      desc: 'Vertical squeeze',                            category: 'creative' },
  { name: 'coverup',       desc: 'Cover from bottom',                           category: 'slide' },
  { name: 'coverdown',     desc: 'Cover from top',                              category: 'slide' },
  { name: 'coverleft',     desc: 'Cover from right',                            category: 'slide' },
  { name: 'coverright',    desc: 'Cover from left',                             category: 'slide' },
  { name: 'revealup',      desc: 'Reveal upward',                               category: 'slide' },
  { name: 'revealdown',    desc: 'Reveal downward',                             category: 'slide' },
  { name: 'revealleft',    desc: 'Reveal leftward',                             category: 'slide' },
  { name: 'revealright',   desc: 'Reveal rightward',                            category: 'slide' },
];

function listTransitions() {
  console.log(chalk.bold('\n  Available xfade transitions\n'));

  const categories = [...new Set(TRANSITIONS.map(t => t.category))];

  for (const cat of categories) {
    console.log(chalk.blue(`  ${cat.toUpperCase()}`));
    const items = TRANSITIONS.filter(t => t.category === cat);
    for (const t of items) {
      const def = t.name === 'fade' ? chalk.dim(' (default)') : '';
      console.log(`    ${chalk.green(t.name.padEnd(16))} ${t.desc}${def}`);
    }
    console.log();
  }

  console.log(chalk.dim(`  Usage: s2v build --transition wipeleft\n`));
  console.log(chalk.dim(`  Or set in demo.yaml:\n    transition: wipeleft\n    transition_duration: 0.5\n`));
}

module.exports = { listTransitions, TRANSITIONS };
