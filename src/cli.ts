#!/usr/bin/env node

import { program } from 'commander';
import { resolve } from 'path';
import { createRepl } from './index';
import { version } from '../package.json';

(async () => {
  try {
    program
      .version(version)
      .option('-c, --config <file>', 'configuration file to use', (file) =>
        resolve(file),
      )
      .option('-v, --verbose', 'display verbose logging')
      .parse(process.argv);

    const { config, verbose } = program.opts();

    if (verbose) process.env.RREPL_VERBOSE = 'true';

    const repl = await createRepl({ config });

    // istanbul ignore else
    if (process.send) process.send('init');

    repl.on('exit', () => {
      process.exit(0);
    });
  } catch (err) {
    // istanbul ignore if
    if (!err.logged) console.error(err);
    process.exit(1);
  }
})();
