const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const semver = require('semver');
const tmp = require('tmp-promise');

const WELCOME_MSG = /Welcome to rrepl v(\d+\.\d+\.\d+) \(Node.js v(\d+\.\d+\.\d+)\)/;
const ERR_MSG = 'An error occurred while loading your configuration';

tmp.setGracefulCleanup();

/**
 * @typedef {Object} Result
 * @property {number} code return code of the `rrepl` process
 * @property {any[]} errs array of any errors that occur during execution
 * @property {string} signal exit signal received by the `rrepl` process
 * @property {string} stdout string concatenated with all output to stdout
 * @property {jest.fn} stdoutMonitor jest mock called with any output to stdout
 * @property {string} stderr string concatenated with all output to stderr
 * @property {jest.fn} stderrMonitor jest mock called with any output to stderr
 */

/**
 *
 * @param {Object} opts
 * @param {string[]} opts.argv arguments to provide to the `rrepl` script
 * @param {Object<string,string>} opts.env environment variables to set
 * @returns {Promise<Result>}
 */
const rrepl = ({ argv = [], env = {} } = {}) => {
  const result = {
    errs: [],
    stdout: '',
    stdoutMonitor: jest.fn(),
    stderr: '',
    stderrMonitor: jest.fn(),
  };

  return new Promise((resolve) => {
    const child = spawn('node', [path.resolve('index.js'), ...argv], {
      cwd: path.resolve('.'),
      env: { ...process.env, ...env }, // eslint-disable-line node/no-unsupported-features/es-syntax
      timeout: 2500,
    });

    child.once('exit', (code, signal) => {
      result.code = code;
      result.signal = signal;

      resolve(result);
    });
    child.once('error', (err) => {
      result.errs.push(err);
      resolve(result);
    });
    child.stdout.on('data', (data) => {
      const string = data.toString();
      result.stdout = result.stdout.concat(string);
      result.stdoutMonitor(string);
    });
    child.stderr.on('data', (data) => {
      const string = data.toString();
      result.stderr = result.stderr.concat(string);
      result.stderrMonitor(string);
    });

    setTimeout(() => {
      try {
        child.stdin.write('.exit\n');
      } catch (err) {
        result.errs.push(err);
      }
    }, 500);
  });
};

it('returns an exit code of 0', async () => {
  const result = await rrepl({ argv: ['-c', path.resolve('.noderc.test')] });
  expect(result).toHaveProperty('code', 0);
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(WELCOME_MSG),
  );
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching('PASS'),
  );
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 0 when defaulting to ~/.noderc', async () => {
  const result = await rrepl({ env: { NODE_REPL_MODE: 'strict' } });
  expect(result).toHaveProperty('code', 0);
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(WELCOME_MSG),
  );
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 0 when passed a bad config path', async () => {
  const result = await rrepl({
    argv: ['-c', path.resolve('.noderc.test.noexists')],
  });
  expect(result).toHaveProperty('code', 0);
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(WELCOME_MSG),
  );
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 0 and logs debug messages when passed a bad config path in verbose mode', async () => {
  const result = await rrepl({
    argv: ['-c', path.resolve('.noderc.test.noexists'), '-v'],
  });
  expect(result).toHaveProperty('code', 0);
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(WELCOME_MSG),
  );
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(
      /\[DEBUG\] Using configuration at .*\.noderc\.test\.noexists/,
    ),
  );
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(
      /\[DEBUG\] No configuration at .*\.noderc\.test\.noexists/,
    ),
  );
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 0 when passed a config file with no export', async () => {
  const result = await rrepl({
    argv: ['-c', path.resolve('.noderc.test.nofunc')],
  });
  expect(result).toHaveProperty('code', 0);
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(WELCOME_MSG),
  );
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it.each(['.noderc.test.throws', '.noderc.test.throws.nofunc'])(
  'returns an exit code of 1 when the config file throws an error (%s)',
  async (filename) => {
    const result = await rrepl({
      argv: ['-c', path.resolve(filename)],
    });
    expect(result).toHaveProperty('code', 1);
    expect(result.stdoutMonitor).toHaveBeenCalledWith(
      expect.stringMatching(WELCOME_MSG),
    );
    expect(result.stderrMonitor).toHaveBeenCalledWith(
      expect.stringContaining(ERR_MSG),
    );
  },
);

if (os.platform() !== 'win32' && semver.gt(process.version, '11.10.0')) {
  it('warns with an error when setting up history fails', async () => {
    const history = await tmp.file({
      mode: '0200',
      prefix: '.node_repl_history_',
    });
    const result = await rrepl({
      argv: ['-c', path.resolve('.noderc.test')],
      env: { NODE_REPL_HISTORY: history.path },
    });
    expect(result.stdoutMonitor).toHaveBeenCalledWith(
      expect.stringMatching(/REPL session history will not be persisted/),
    );

    history.cleanup();
  });
}
