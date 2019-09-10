/* eslint-env jest */
const { spawn } = require('child_process');
const path = require('path');
const semver = require('semver');
const tmp = require('tmp-promise');

const WELCOME_MSG = /Welcome to rrepl v(\d+\.\d+\.\d+) \(Node.js v(\d+\.\d+\.\d+)\)/;
const ERR_MSG = 'An error occurred while loading your configuration file';

tmp.setGracefulCleanup();

const rrepl = ({ argv = [], env = {} } = {}) => {
  const stdoutMonitor = jest.fn();
  const stderrMonitor = jest.fn();
  let stdout = '';
  let stderr = '';

  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.resolve('index.js'), ...argv], {
      cwd: path.resolve('.'),
      env: { ...process.env, ...env },
      timeout: 2500,
    });

    child.once('exit', (code, signal) => {
      resolve({
        code,
        signal,
        stdout,
        stdoutMonitor,
        stderr,
        stderrMonitor,
      });
    });
    child.once('error', error => {
      reject(error);
    });
    child.stdout.on('data', data => {
      const string = data.toString();
      stdout = stdout.concat(string);
      stdoutMonitor(string);
    });
    child.stderr.on('data', data => {
      const string = data.toString();
      stderr = stderr.concat(string);
      stderrMonitor(string);
    });

    child.stdin.write('.exit\n');
  });
};

it('returns an exit code of 0', async () => {
  const result = await rrepl({ argv: ['-c', path.resolve('.noderc.test')] });
  expect(result).toHaveProperty('code', 0);
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(WELCOME_MSG),
  );
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringContaining('PASS'),
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

it('returns an exit code of 0 when passed a bad .noderc path', async () => {
  const result = await rrepl({
    argv: ['-c', path.resolve('.noderc.test.noexists')],
  });
  expect(result).toHaveProperty('code', 0);
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(WELCOME_MSG),
  );
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 0 when passed a .noderc with no export', async () => {
  const result = await rrepl({
    argv: ['-c', path.resolve('.noderc.test.nofunc')],
  });
  expect(result).toHaveProperty('code', 0);
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(WELCOME_MSG),
  );
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 1 when the .noderc file throws an error', async () => {
  const result = await rrepl({
    argv: ['-c', path.resolve('.noderc.test.throws')],
  });
  expect(result).toHaveProperty('code', 1);
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(WELCOME_MSG),
  );
  expect(result.stderrMonitor).toHaveBeenCalledWith(
    expect.stringContaining(ERR_MSG),
  );
});

if (semver.gt(process.version, '11.10.0')) {
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
