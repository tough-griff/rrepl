import { constants as FS, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import repl, {
  REPL_MODE_SLOPPY,
  REPL_MODE_STRICT,
  REPLServer,
  ReplOptions,
} from 'repl';
import chalk from 'chalk';
import { version } from '../package.json';

interface RREPLOpts extends ReplOptions {
  config?: string;
  verbose?: boolean;
}

export const RREPL_STR =
  chalk.red('r') +
  chalk.yellow('r') +
  chalk.green('e') +
  chalk.blue('p') +
  chalk.magenta('l');

export default class RREPL {
  server: REPLServer;
  private _config: string;
  private _verbose: boolean;
  private _homedir = os.homedir();

  constructor({ config, verbose, ...opts }: RREPLOpts) {
    const replMode =
      process.env.NODE_REPL_MODE === 'strict'
        ? REPL_MODE_STRICT
        : REPL_MODE_SLOPPY;

    this.server = repl.start({ replMode, ...opts }).pause();

    this._config = config ?? path.join(this._homedir, '.noderc');
    this._verbose = !!verbose;

    readline.cursorTo(process.stdout, 0);
  }

  debug(message: string, ...args: any[]): void {
    if (this._verbose) console.log(chalk.gray('[DEBUG]', message), ...args);
  }

  async setupHistory(): Promise<void> {
    if (process.env.NODE_REPL_HISTORY === '') {
      this.debug('Skipping history setup');
      return undefined;
    }

    const historyPath =
      process.env.NODE_REPL_HISTORY ??
      path.join(this._homedir, '.node_repl_history');

    this.debug('Configuring history at %s', historyPath);
    return new Promise<void>((resolve) => {
      this.server.setupHistory(historyPath, () => {
        // resolve with the configured server, swallowing any errors
        resolve();
      });
    });
  }

  async configure(): Promise<void> {
    try {
      await fs.access(this._config, FS.R_OK);
      const noderc = await import(this._config);
      if (typeof noderc?.rrepl !== 'function') {
        this.debug(
          'Configuration at %s did not export a `rrepl` function',
          this._config,
        );
        return;
      }

      this.debug('Using configuration at %s', this._config);
      Reflect.apply(noderc.rrepl, this.server, [this.server]);
    } catch (err: any) {
      if (err.syscall !== 'access' || err.code !== 'ENOENT') {
        console.error(
          chalk.red('An error occurred while loading configuration at %s:\n%s'),
          this._config,
          err,
        );
        return;
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
    console.log(chalk.gray('Type ".help" for more information.'));

    const rrepl = new RREPL(opts);
    await rrepl.setupHistory();
    await rrepl.configure();

    rrepl.server.prompt();

    return rrepl.server;
  }
}
