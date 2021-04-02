const { fork } = require('child_process');
const os = require('os');
const path = require('path');
const semver = require('semver');
const tmp = require('tmp-promise');

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
    const child = fork('./cli', argv, {
      cwd: path.resolve('.'),
      env: { ...process.env, ...env },
      stdio: 'pipe',
      timeout: 1000,
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

    child.on('message', (message) => {
      if (message === 'init') child.stdin.write('.exit\n');
    });
  });
};

it('returns an exit code of 0', async () => {
  const result = await rrepl({ argv: ['-c', '.noderc.test'] });
  expect(result).toHaveProperty('code', 0);
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 0 when defaulting to ~/.noderc', async () => {
  const result = await rrepl({ env: { NODE_REPL_MODE: 'strict' } });
  expect(result).toHaveProperty('code', 0);
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 0 when passed a bad config path', async () => {
  const result = await rrepl({
    argv: ['-c', '.noderc.test.noexists'],
  });
  expect(result).toHaveProperty('code', 0);
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 0 and logs debug messages when passed a bad config path in verbose mode', async () => {
  const result = await rrepl({
    argv: ['-c', '.noderc.test.noexists', '-v'],
  });
  expect(result).toHaveProperty('code', 0);
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(
      /\[DEBUG\] Using configuration at .*\.noderc\.test\.noexists/,
    ),
  );
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(
      /\[DEBUG\] No configuration found at .*\.noderc\.test\.noexists/,
    ),
  );
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 0 when passed a config file with no export', async () => {
  const result = await rrepl({
    argv: ['-c', '.noderc.test.nofunc'],
  });
  expect(result).toHaveProperty('code', 0);
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it.each(['.noderc.test.throws', '.noderc.test.throws.nofunc'])(
  'returns an exit code of 1 when the config file throws an error (%s)',
  async (filename) => {
    const result = await rrepl({
      argv: ['-c', filename],
    });
    expect(result).toHaveProperty('code', 1);
    expect(result.stderrMonitor).toHaveBeenCalledWith(
      expect.stringContaining(
        'An error occurred while loading your configuration',
      ),
    );
  },
);

if (os.platform() !== 'win32' && semver.gte(process.version, '11.10.0')) {
  it('warns with an error when setting up history fails', async () => {
    const history = await tmp.file({
      mode: '0200',
      prefix: '.node_repl_history_',
    });
    const result = await rrepl({
      argv: ['-c', '.noderc.test'],
      env: { NODE_REPL_HISTORY: history.path },
    });
    expect(result.stdoutMonitor).toHaveBeenCalledWith(
      expect.stringMatching(/REPL session history will not be persisted/),
    );

    history.cleanup();
  });
}
