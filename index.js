#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');
const repl = require('repl');
const semver = require('semver');
const { version: VERSION } = require('./package.json');

const { REPL_MODE_SLOPPY, REPL_MODE_STRICT } = repl;
const {
  env: { NODE_REPL_HISTORY, NODE_REPL_MODE },
  version: NODE_VERSION,
} = process;

const RREPL =
  chalk.red('r') +
  chalk.yellow('r') +
  chalk.green('e') +
  chalk.blue('p') +
  chalk.magenta('l');

const home = os.homedir();

/**
 * @returns {repl.REPLServer}
 */
const createReplServer = () => {
  const replServer = repl
    .start({
      replMode:
        NODE_REPL_MODE === 'strict' ? REPL_MODE_STRICT : REPL_MODE_SLOPPY,
    })
    .pause();

  // replServer.setupHistory() added in: v11.10.0
  if (semver.lt(NODE_VERSION, '11.10.0') || NODE_REPL_HISTORY === '')
    return replServer;

  replServer.setupHistory(
    NODE_REPL_HISTORY || path.join(home, '.node_repl_history'),
    (_err, _server) => {}, // swallow history errors
  );

  return replServer;
};

program
  .version(VERSION)
  .option(
    '-c, --config <file>',
    'configuration file to use',
    path.join(home, '.noderc'),
  )
  .option('-v, --verbose', 'display verbose logging')
  .parse(process.argv);

console.log('Welcome to %s v%s (Node.js %s)', RREPL, VERSION, NODE_VERSION);
console.log(chalk.gray('Type ".help" for more information.'));

const { config, verbose } = program.opts();

if (verbose)
  console.log(chalk.gray('[DEBUG] Using configuration at %s'), config);

/** @type {repl.REPLServer | void} */
let replServer;
if (fs.existsSync(config)) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const noderc = require(config);
    replServer = createReplServer();
    if (typeof noderc === 'function') noderc(replServer);
  } catch (err) {
    if (replServer) {
      replServer.close();
      console.error();
    }

    console.error(
      chalk.red('An error occurred while loading your configuration at %s'),
      config,
    );
    console.error(err);
    process.exit(1);
  }
} else {
  if (verbose)
    console.log(chalk.gray('[DEBUG] No configuration at %s'), config);

  replServer = createReplServer();
}

replServer.prompt();

replServer.on('exit', () => {
  process.exit(0);
});
