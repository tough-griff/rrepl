#!/usr/bin/env node

const commander = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');
const repl = require('repl');
const semver = require('semver');

const { version: VERSION } = require('./package.json');

const { version: NODE_VERSION } = process;

const RREPL_STRING = [
  chalk.red('r'),
  chalk.yellow('r'),
  chalk.green('e'),
  chalk.blue('p'),
  chalk.magenta('l'),
].join('');

const { NODE_REPL_HISTORY, NODE_REPL_MODE } = process.env;
const { REPL_MODE_SLOPPY, REPL_MODE_STRICT } = repl;

commander.version(VERSION);
commander.option('-c, --config <file>', 'configuration file to use, defaults to ~/.noderc');
commander.parse(process.argv);

console.log(`Welcome to ${RREPL_STRING} v${VERSION} (Node.js ${NODE_VERSION})`);
console.log(chalk.gray('Type ".help" for more information.'));
const replServer = repl.start({
  replMode: NODE_REPL_MODE === 'strict' ? REPL_MODE_STRICT : REPL_MODE_SLOPPY,
  useGlobal: true,
});

const home = os.homedir();

if (semver.gt(NODE_VERSION, '11.10.0') && NODE_REPL_HISTORY !== '') {
  replServer.setupHistory(
    NODE_REPL_HISTORY || path.join(home, '.node_repl_history'),
    (err, _server) => {
      if (err) throw err;
    },
  );
}

/* eslint-disable global-require, import/no-dynamic-require */
const nodercPath = commander.config ? path.resolve(commander.config) : path.join(home, '.noderc');
if (fs.existsSync(nodercPath)) {
  try {
    const noderc = require(nodercPath);
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
