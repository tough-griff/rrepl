const console = require('console');
const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');
const process = require('process');
const readline = require('readline');
const repl = require('repl');
const semver = require('semver');
const { version } = require('./package.json');

const RREPL_STR =
  chalk.red('r') +
  chalk.yellow('r') +
  chalk.green('e') +
  chalk.blue('p') +
  chalk.magenta('l');

/**
 * @param {any} message
 * @param {any[]} args
 */
const debug = (message, ...args) => {
  if (process.env.RREPL_VERBOSE) console.log(message, ...args);
};

/**
 * @returns {Promise<repl.REPLServer>}
 */
const startReplServer = () => {
  const replMode =
    process.env.NODE_REPL_MODE === 'strict'
      ? repl.REPL_MODE_STRICT
      : repl.REPL_MODE_SLOPPY;

  return new Promise((resolve) => {
    const replServer = repl.start({ replMode }).pause();

    // move the existing cursor to position 0 so we overwrite the default prompt
    readline.cursorTo(process.stdout, 0);

    // replServer.setupHistory() added in: v11.10.0
    if (
      semver.lt(process.version, '11.10.0') ||
      process.env.NODE_REPL_HISTORY === ''
    )
      return resolve(replServer);

    const historyPath =
      process.env.NODE_REPL_HISTORY ||
      path.join(os.homedir(), '.node_repl_history');

    debug(chalk.gray('[DEBUG] Configuring history at %s'), historyPath);

    return replServer.setupHistory(historyPath, (err, server) => {
      // resolve with the configured server, swallowing any errors
      return resolve(server);
    });
  });
};

/**
 * @param {Object} opts
 * @param {string} opts.config
 * @returns {Promise<repl.REPLServer>}
 */
module.exports.createRepl = async function createRepl({
  config = path.join(os.homedir(), '.noderc'),
}) {
  console.log(
    'Welcome to %s@%s (Node.js %s)',
    RREPL_STR,
    version,
    process.version,
  );
  console.log(chalk.gray('Type ".help" for more information.'));

  const replServer = await startReplServer();

  if (fs.existsSync(config)) {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const noderc = require(config);
      if (typeof noderc === 'function') {
        debug(chalk.gray('[DEBUG] Using configuration at %s'), config);
        noderc(replServer);
      } else {
        debug(
          chalk.gray('[DEBUG] Configuration at %s did not export a function'),
          config,
        );
      }
    } catch (err) {
      replServer.close();

      console.error(
        chalk.red('An error occurred while loading configuration at %s:\n%s'),
        config,
        err,
      );
      err.logged = true;

      throw err;
    }
  } else {
    debug(chalk.gray('[DEBUG] No configuration found at %s'), config);
  }

  replServer.prompt();

  return replServer;
};
