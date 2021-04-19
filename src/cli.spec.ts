import * as childProcess from 'child_process';
import * as os from 'os';
import * as semver from 'semver';
import * as tmp from 'tmp-promise';

const TIMEOUT = 6_000;

class Result {
  argv: ReadonlyArray<string>;
  env: NodeJS.ProcessEnv;
  code: number | null = null;
  errs: Error[] = [];
  signal: string | null = null;
  stderr: string = '';
  stderrMonitor: jest.Mock = jest.fn();
  stdout: string = '';
  stdoutMonitor: jest.Mock = jest.fn();

  constructor(argv: ReadonlyArray<string>, env: NodeJS.ProcessEnv) {
    this.argv = argv;
    this.env = env;
  }
}

const fork = (
  argv: ReadonlyArray<string> = [],
  env: NodeJS.ProcessEnv = {},
): Promise<Result> => {
  return new Promise((resolve) => {
    const result = new Result(argv, env);

    const child = childProcess.fork('./src/cli', argv, {
      env: {
        ...process.env,
        TS_NODE_PROJECT: './src/tsconfig.json',
        ...env,
      },
      execArgv: ['-r', 'ts-node/register'],
      stdio: 'pipe',
    });

    child.on('error', (err) => {
      result.errs.push(err);
    });

    child.stdout?.on('data', (data) => {
      const string = data.toString();
      result.stdout = result.stdout.concat(string);
      result.stdoutMonitor(string);
    });

    child.stderr?.on('data', (data) => {
      const string = data.toString();
      result.stderr = result.stderr.concat(string);
      result.stderrMonitor(string);
    });

    child.on('message', (message) => {
      if (message === 'init') {
        child.stdin?.write('.exit\n', 'utf8', (err) => {
          if (err) result.errs.push(err);
        });
      }
    });

    child.once('exit', (code, signal) => {
      result.code = code;
      result.signal = signal;
      resolve(result);
    });
  });
};

it(
  'returns an exit code of 0',
  async () => {
    const result = await fork(['-c', '.noderc.test.js']);
    expect(result.errs).toHaveLength(0);
    expect(result).toHaveProperty('signal', null);
    expect(result).toHaveProperty('code', 0);
    expect(result.stderrMonitor).not.toHaveBeenCalled();
  },
  TIMEOUT,
);

it(
  'returns an exit code of 0 when defaulting to ~/.noderc',
  async () => {
    const result = await fork([], { NODE_REPL_MODE: 'strict' });
    expect(result.errs).toHaveLength(0);
    expect(result).toHaveProperty('signal', null);
    expect(result).toHaveProperty('code', 0);
    expect(result.stderrMonitor).not.toHaveBeenCalled();
  },
  TIMEOUT,
);

it(
  'returns an exit code of 0 when passed a bad config path',
  async () => {
    const result = await fork(['-c', '.noderc.noexists.test.js']);
    expect(result.errs).toHaveLength(0);
    expect(result).toHaveProperty('signal', null);
    expect(result).toHaveProperty('code', 0);
    expect(result.stderrMonitor).not.toHaveBeenCalled();
  },
  TIMEOUT,
);

it(
  'returns an exit code of 0 and logs debug messages when passed a bad config path in verbose mode',
  async () => {
    const result = await fork(['-c', '.noderc.noexists.test.js', '-v']);
    expect(result.errs).toHaveLength(0);
    expect(result).toHaveProperty('signal', null);
    expect(result).toHaveProperty('code', 0);
    expect(result.stdoutMonitor).toHaveBeenCalledWith(
      expect.stringMatching(
        /\[DEBUG\] No configuration found at .*\.noderc\.noexists\.test\.js/,
      ),
    );
    expect(result.stderrMonitor).not.toHaveBeenCalled();
  },
  TIMEOUT,
);

it(
  'returns an exit code of 0 when passed a config file with no export',
  async () => {
    const result = await fork(['-c', '.noderc.nofunc.test.js']);
    expect(result.errs).toHaveLength(0);
    expect(result).toHaveProperty('signal', null);
    expect(result).toHaveProperty('code', 0);
    expect(result.stderrMonitor).not.toHaveBeenCalled();
  },
  TIMEOUT,
);

it.each(['.noderc.throws.test.js', '.noderc.throws.nofunc.test.js'])(
  'returns an exit code of 1 when the config file throws an error (%s)',
  async (filename) => {
    const result = await fork(['-c', filename]);
    expect(result.errs).toHaveLength(0);
    expect(result).toHaveProperty('signal', null);
    expect(result).toHaveProperty('code', 1);

    expect(result.stderrMonitor).toHaveBeenCalledWith(
      expect.stringContaining(
        'An error occurred while loading configuration at',
      ),
    );
  },
  TIMEOUT,
);

if (os.platform() !== 'win32' && semver.gte(process.version, '11.10.0')) {
  it(
    'warns with an error when setting up history fails',
    async () => {
      const tmpFile = await tmp.file({
        mode: 0o0200,
        prefix: '.node_repl_history_',
      });
      const result = await fork(['-c', '.noderc.test.js'], {
        NODE_REPL_HISTORY: tmpFile.path,
      });
      expect(result).toHaveProperty('signal', null);
      expect(result.errs).toHaveLength(0);
      // expect(result).toHaveProperty('code', 0); FIXME
      expect(result.stdoutMonitor).toHaveBeenCalledWith(
        expect.stringMatching(/REPL session history will not be persisted/),
      );

      return tmpFile.cleanup();
    },
    TIMEOUT,
  );
}
