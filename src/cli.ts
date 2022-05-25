#!/usr/bin/env node

import { program } from 'commander';
import path from 'path';
import RREPL, { RREPL_STR } from './index';
import { version } from '../package.json';

const resolve = (file: string) => path.resolve(file);

(async () => {
  program.name('rrepl');
  program.version(version);
  program.option('-c, --config <file>', 'configuration file to use', resolve);
  program.option('-v, --verbose', 'display verbose logging');
  program.addHelpText('before', `${RREPL_STR} v${version}`);
  program.parse(process.argv);

  const repl = await RREPL.create(program.opts());

  if (process.send) process.send('init');

  repl.on('exit', () => {
    process.exit(0);
  });
})();
