import { constants as FS, promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { cursorTo } from 'readline';
import { REPL_MODE_SLOPPY, REPL_MODE_STRICT, REPLServer, start } from 'repl';
import { blue, gray, green, magenta, red, yellow } from 'chalk';
import { version } from '../package.json';

interface RREPLOpts {
  config?: string;
  verbose: boolean;
}

export const RREPL_STR =
  red('r') + yellow('r') + green('e') + blue('p') + magenta('l');

export default class RREPL {
  server: REPLServer;
  private _config: string;
  private _verbose: boolean;
  private _homedir = homedir();

  constructor({ config, verbose }: RREPLOpts) {
    const replMode =
      process.env.NODE_REPL_MODE === 'strict'
        ? REPL_MODE_STRICT
        : REPL_MODE_SLOPPY;

    this.server = start({ replMode }).pause();

    this._config = config ?? join(this._homedir, '.noderc');
    this._verbose = verbose;

    cursorTo(process.stdout, 0);
  }

  debug(message: string, ...args: any[]) {
    if (this._verbose) console.log(gray(`[DEBUG] ${message}`), ...args);
  }

  async setupHistory() {
    if (process.env.NODE_REPL_HISTORY === '') {
      this.debug('Skipping history setup');
      return undefined;
    }

    const historyPath =
      process.env.NODE_REPL_HISTORY ??
      join(this._homedir, '.node_repl_history');

    this.debug('Configuring history at %s', historyPath);
    return new Promise<void>((resolve) => {
      this.server.setupHistory(historyPath, () => {
        // resolve with the configured server, swallowing any errors
        resolve();
      });
    });
  }

  async configure() {
    try {
      await fs.access(this._config, FS.R_OK);
      const noderc = await import(this._config);
      if (typeof noderc !== 'function') {
        this.debug(
          'Configuration at %s did not export a function',
          this._config,
        );
        return;
      }

      this.debug('Using configuration at %s', this._config);
      Reflect.apply(noderc, this.server, [this.server]);
    } catch (err: any) {
      if (err.syscall !== 'access' || err.code !== 'ENOENT') {
        this.server.close();

        console.error(
          red('An error occurred while loading configuration at %s:\n%s'),
          this._config,
          err,
        );
        err.logged = true;

        throw err;
      }

      this.debug('No configuration found at %s', this._config);
    }
  }

  static async create(opts: RREPLOpts): Promise<REPLServer> {
    console.log(
      'Welcome to %s@%s (Node.js %s)',
      RREPL_STR,
      version,
      process.version,
    );
    console.log(gray('Type ".help" for more information.'));

    const repl = new RREPL(opts);
    await repl.setupHistory();
    await repl.configure();

    repl.server.prompt();

    return repl.server;
  }
}
