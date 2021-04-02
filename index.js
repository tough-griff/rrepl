const console = require('console');
const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const repl = require('repl');
const semver = require('semver');
const { version: VERSION } = require('./package.json');

const { REPL_MODE_SLOPPY, REPL_MODE_STRICT } = repl;

const RREPL =
  chalk.red('r') +
  chalk.yellow('r') +
  chalk.green('e') +
  chalk.blue('p') +
  chalk.magenta('l');

const home = os.homedir();

/**
 * @param {boolean} verbose
 * @param {any} message
 * @param {any[]} args
 */
const debug = (verbose, message, ...args) => {
  if (verbose) console.log(message, ...args);
};

/**
 * @param {NodeJS.ProcessEnv} env process.env
 * @param {string} version processs.version
 * @param {boolean} verbose
 * @returns {Promise<repl.REPLServer>}
 */
const createReplServer = (
  { NODE_REPL_HISTORY, NODE_REPL_MODE },
  version,
  verbose,
) => {
  return new Promise((resolve) => {
    const replMode =
      NODE_REPL_MODE === 'strict' ? REPL_MODE_STRICT : REPL_MODE_SLOPPY;
    const replServer = repl.start({ replMode }).pause();

    // move the existing cursor to position 0 so we overwrite the default prompt
    readline.cursorTo(process.stdout, 0);

    // replServer.setupHistory() added in: v11.10.0
    if (semver.lt(version, '11.10.0') || NODE_REPL_HISTORY === '')
      return resolve(replServer);

    const historyPath =
      NODE_REPL_HISTORY || path.join(home, '.node_repl_history');

    debug(
      verbose,
      chalk.gray('[DEBUG] Configuring history at %s'),
      historyPath,
    );

    return replServer.setupHistory(historyPath, (err, server) => {
      // resolve with the configured server, swallowing any errors
      return resolve(server);
    });
  });
};

/**
 * @param {NodeJS.Process} process
 * @param {string[]} process.argv
 * @param {NodeJS.ProcessEnv} process.env
 * @param {string} process.version
 * @returns {Promise<repl.REPLServer>}
 */
module.exports = async function rrepl({ argv, env, version }) {
  const program = new Command('rrepl');

  program
    .version(VERSION)
    .option(
      '-c, --config <file>',
      'configuration file to use',
      (file) => path.resolve(file),
      path.join(home, '.noderc'),
    )
    .option('-v, --verbose', 'display verbose logging')
    .parse(argv);

  console.log('Welcome to %s v%s (Node.js %s)', RREPL, VERSION, version);
  console.log(chalk.gray('Type ".help" for more information.'));

  const { config, verbose } = program.opts();

  const replServer = await createReplServer(env, version, verbose);

  if (fs.existsSync(config)) {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const noderc = require(config);
      if (typeof noderc === 'function') {
        debug(verbose, chalk.gray('[DEBUG] Using configuration at %s'), config);
        noderc(replServer);
      } else {
        debug(
          verbose,
          chalk.gray('[DEBUG] Configuration at %s did not export a function'),
          config,
        );
      }
    } catch (err) {
      replServer.close();

      console.error(
        chalk.red('An error occurred while loading your configuration at %s:'),
        config,
      );
      console.error(err);
      err.code = 1;
      throw err;
    }
  } else {
    debug(verbose, chalk.gray('[DEBUG] No configuration found at %s'), config);
  }

  replServer.prompt();

  return replServer;
};
