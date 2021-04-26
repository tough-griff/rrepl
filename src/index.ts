import * as console from 'console';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import * as readline from 'readline';
import * as repl from 'repl';
import * as chalk from 'chalk';
import { version } from '../package.json';

const RREPL_STR =
  chalk.red('r') +
  chalk.yellow('r') +
  chalk.green('e') +
  chalk.blue('p') +
  chalk.magenta('l');

const debug = (message: any, ...args: any[]) => {
  if (process.env.RREPL_VERBOSE) console.log(message, ...args);
};

const startReplServer = (): Promise<repl.REPLServer> => {
  return new Promise((resolve) => {
    const replMode =
      process.env.NODE_REPL_MODE === 'strict'
        ? repl.REPL_MODE_STRICT
        : repl.REPL_MODE_SLOPPY;

    const replServer = repl.start({ replMode }).pause();

    // move the existing cursor to position 0 so we overwrite the default prompt
    readline.cursorTo(process.stdout, 0);

    if (process.env.NODE_REPL_HISTORY === '') {
      debug(chalk.gray('[DEBUG] Skipping history setup'));
      return resolve(replServer);
    }

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

export async function createRepl({
  config = path.join(os.homedir(), '.noderc'),
}): Promise<repl.REPLServer> {
  console.log(
    'Welcome to %s@%s (Node.js %s)',
    RREPL_STR,
    version,
    process.version,
  );
  console.log(chalk.gray('Type ".help" for more information.'));

  const replServer = await startReplServer();

  try {
    await fs.promises.access(config, fs.constants.R_OK);
    const noderc = await import(config);
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
    if (err.syscall !== 'access' || err.code !== 'ENOENT') {
      replServer.close();

      console.error(
        chalk.red('An error occurred while loading configuration at %s:\n%s'),
        config,
        err,
      );
      err.logged = true;

      throw err;
    }

    debug(chalk.gray('[DEBUG] No configuration found at %s'), config);
  }

  replServer.prompt();

  return replServer;
}
