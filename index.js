#!/usr/bin/env node

const commander = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');
const repl = require('repl');
const semver = require('semver');

const { REPL_MODE_SLOPPY, REPL_MODE_STRICT } = repl;
const { version: VERSION } = require('./package.json');

const {
  argv,
  env: { NODE_REPL_HISTORY, NODE_REPL_MODE },
  version: NODE_VERSION,
} = process;

const RREPL =
  chalk.red('r') +
  chalk.yellow('r') +
  chalk.green('e') +
  chalk.blue('p') +
  chalk.magenta('l');

commander.version(VERSION);
commander.option(
  '-c, --config <file>',
  'configuration file to use, defaults to ~/.noderc',
);
commander.parse(argv);

console.log('Welcome to %s v%s (Node.js %s)', RREPL, VERSION, NODE_VERSION);
console.log(chalk.gray('Type ".help" for more information.'));
const replServer = repl.start({
  replMode: NODE_REPL_MODE === 'strict' ? REPL_MODE_STRICT : REPL_MODE_SLOPPY,
  useGlobal: true,
});

const home = os.homedir();

// replServer.setupHistory() added in: v11.10.0
if (semver.gte(NODE_VERSION, '11.10.0') && NODE_REPL_HISTORY !== '') {
  replServer.setupHistory(
    NODE_REPL_HISTORY || path.join(home, '.node_repl_history'),
    (_err, _server) => {}, // swallow history errors
  );
}

const nodercPath = commander.config
  ? path.resolve(commander.config)
  : path.join(home, '.noderc');

if (fs.existsSync(nodercPath)) {
  try {
    const noderc = require(nodercPath); // eslint-disable-line global-require, import/no-dynamic-require
    if (typeof noderc === 'function') noderc(replServer);
  } catch (err) {
    console.log();
    console.error(
      'An error occurred while loading your configuration file (%s):',
      nodercPath,
    );
    console.error(err);
    process.exit(1);
  }
}

replServer.prompt();

replServer.on('exit', () => {
  process.exit(0);
});
