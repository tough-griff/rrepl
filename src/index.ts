import { constants as FS, promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { cursorTo } from 'readline';
import { REPL_MODE_SLOPPY, REPL_MODE_STRICT, REPLServer, start } from 'repl';
import { blue, gray, green, magenta, red, yellow } from 'chalk';
import { version } from '../package.json';

const RREPL_STR =
  red('r') + yellow('r') + green('e') + blue('p') + magenta('l');

const debug = (message: string, ...args: any[]) => {
  if (process.env.RREPL_VERBOSE) console.log(gray(message), ...args);
};

const startReplServer = (): Promise<REPLServer> => {
  return new Promise((resolve) => {
    const replMode =
      process.env.NODE_REPL_MODE === 'strict'
        ? REPL_MODE_STRICT
        : REPL_MODE_SLOPPY;

    const replServer = start({ replMode }).pause();

    // move the existing cursor to position 0 so we overwrite the default prompt
    cursorTo(process.stdout, 0);

    if (process.env.NODE_REPL_HISTORY === '') {
      debug('[DEBUG] Skipping history setup');
      return resolve(replServer);
    }

    const historyPath =
      process.env.NODE_REPL_HISTORY || join(homedir(), '.node_repl_history');

    debug('[DEBUG] Configuring history at %s', historyPath);

    return replServer.setupHistory(historyPath, (_err, server) => {
      // resolve with the configured server, swallowing any errors
      return resolve(server);
    });
  });
};

export async function createRepl({
  config = join(homedir(), '.noderc'),
}): Promise<REPLServer> {
  console.log(
    'Welcome to %s@%s (Node.js %s)',
    RREPL_STR,
    version,
    process.version,
  );
  console.log(gray('Type ".help" for more information.'));

  const replServer = await startReplServer();

  try {
    await fs.access(config, FS.R_OK);
    const noderc = await import(config);
    if (typeof noderc === 'function') {
      debug('[DEBUG] Using configuration at %s', config);
      noderc(replServer);
    } else {
      debug('[DEBUG] Configuration at %s did not export a function', config);
    }
  } catch (err: any) {
    if (err.syscall !== 'access' || err.code !== 'ENOENT') {
      replServer.close();

      console.error(
        red('An error occurred while loading configuration at %s:\n%s'),
        config,
        err,
      );
      err.logged = true;

      throw err;
    }

    debug('[DEBUG] No configuration found at %s', config);
  }

  replServer.prompt();

  return replServer;
}
