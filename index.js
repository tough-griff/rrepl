#!/usr/bin/env node

const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');
const repl = require('repl');
const semver = require('semver');

const { version } = require('./package.json');

const RREPL_STRING = [
  chalk.red('r'),
  chalk.yellow('r'),
  chalk.green('e'),
  chalk.blue('p'),
  chalk.magenta('l')
].join('');

const { NODE_REPL_HISTORY, NODE_REPL_MODE } = process.env;
const { REPL_MODE_SLOPPY } = repl;

console.log(`Welcome to ${RREPL_STRING} v${version} (Node.js ${process.version})`);
console.log(chalk.gray('Type ".help" for more information.'));
const replServer = repl.start({
  replMode: NODE_REPL_MODE || REPL_MODE_SLOPPY
});

const home = os.homedir();

if (semver.gt(process.version, '11.10.0') && NODE_REPL_HISTORY !== '') {
  replServer.setupHistory(
    NODE_REPL_HISTORY || path.join(home, '.node_repl_history'),
    (err, server) => {
      if (err) throw err;
    }
  );
}

const nodercPath = path.join(home, '.noderc');
if (fs.existsSync(nodercPath)) {
  try {
    const noderc = require(nodercPath);
    noderc(replServer);
  } catch (err) {
    console.log();
    console.error('There was an error thrown by your .noderc file:');
    console.error(err);
    process.exit(1);
  }
}

replServer.prompt();
