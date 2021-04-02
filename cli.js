#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const process = require('process');
const { createRepl } = require('./index');
const { version } = require('./package.json');

(async () => {
  const program = new Command('rrepl');

  program
    .version(version)
    .option('-c, --config <file>', 'configuration file to use', (file) =>
      path.resolve(file),
    )
    .option('-v, --verbose', 'display verbose logging')
    .parse(process.argv);

  const { config, verbose } = program.opts();

  if (verbose) process.env.RREPL_VERBOSE = true;

  const repl = await createRepl({ config });

  // istanbul ignore else
  if (process.send) process.send('init');

  repl.on('exit', () => {
    process.exit(0);
  });
})().catch((err) => {
  // istanbul ignore if
  if (!err.logged) console.error(err);
  process.exit(1);
});
