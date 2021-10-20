import { fork } from 'child_process';
import { platform } from 'os';
import { withFile } from 'tmp-promise';

jest.setTimeout(6_000);

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

const rrepl = (
  argv: ReadonlyArray<string> = [],
  env: NodeJS.ProcessEnv = {},
): Promise<Result> => {
  return new Promise((resolve) => {
    const result = new Result(argv, env);

    const child = fork('./src/cli', argv, {
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

it('returns an exit code of 0', async () => {
  expect.assertions(4);
  const result = await rrepl(['-c', '.noderc.test.js']);
  expect(result.errs).toHaveLength(0);
  expect(result).toHaveProperty('signal', null);
  expect(result).toHaveProperty('code', 0);
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 0 and logs debug information in verbose mode', async () => {
  expect.assertions(6);
  const result = await rrepl(['-c', '.noderc.test.js', '-v']);
  expect(result.errs).toHaveLength(0);
  expect(result).toHaveProperty('signal', null);
  expect(result).toHaveProperty('code', 0);
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(
      /\[DEBUG\] Configuring history at .*\.node_repl_history/,
    ),
  );
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(
      /\[DEBUG\] Using configuration at .*\.noderc\.test\.js/,
    ),
  );
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 0 and skips history setup in verbose mode', async () => {
  expect.assertions(5);
  const result = await rrepl(['-c', '.noderc.test.js', '-v'], {
    NODE_REPL_HISTORY: '',
  });
  expect(result.errs).toHaveLength(0);
  expect(result).toHaveProperty('signal', null);
  expect(result).toHaveProperty('code', 0);
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringContaining('[DEBUG] Skipping history setup'),
  );
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 0 when defaulting to ~/.noderc', async () => {
  expect.assertions(4);
  const result = await rrepl([], { NODE_REPL_MODE: 'strict' });
  expect(result.errs).toHaveLength(0);
  expect(result).toHaveProperty('signal', null);
  expect(result).toHaveProperty('code', 0);
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 0 when passed a bad config path', async () => {
  expect.assertions(4);
  const result = await rrepl(['-c', '.noderc.noexists.test.js']);
  expect(result.errs).toHaveLength(0);
  expect(result).toHaveProperty('signal', null);
  expect(result).toHaveProperty('code', 0);
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 0 and logs debug messages when passed a bad config path in verbose mode', async () => {
  expect.assertions(5);
  const result = await rrepl(['-c', '.noderc.noexists.test.js', '-v']);
  expect(result.errs).toHaveLength(0);
  expect(result).toHaveProperty('signal', null);
  expect(result).toHaveProperty('code', 0);
  expect(result.stdoutMonitor).toHaveBeenCalledWith(
    expect.stringMatching(
      /\[DEBUG\] No configuration found at .*\.noderc\.noexists\.test\.js/,
    ),
  );
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it('returns an exit code of 0 when passed a config file with no export', async () => {
  expect.assertions(4);
  const result = await rrepl(['-c', '.noderc.nofunc.test.js']);
  expect(result.errs).toHaveLength(0);
  expect(result).toHaveProperty('signal', null);
  expect(result).toHaveProperty('code', 0);
  expect(result.stderrMonitor).not.toHaveBeenCalled();
});

it.each(['.noderc.throws.test.js', '.noderc.throws.nofunc.test.js'])(
  'returns an exit code of 1 when the config file throws an error (%s)',
  async (filename) => {
    expect.assertions(4);
    const result = await rrepl(['-c', filename]);
    expect(result.errs).toHaveLength(0);
    expect(result).toHaveProperty('signal', null);
    expect(result).toHaveProperty('code', 1);
    expect(result.stderrMonitor).toHaveBeenCalledWith(
      expect.stringContaining(
        'An error occurred while loading configuration at',
      ),
    );
  },
);

it.if(platform() !== 'win32')(
  'warns with an error when setting up history fails',
  async () => {
    expect.assertions(3);
    return withFile(
      async ({ path }) => {
        const result = await rrepl(['-c', '.noderc.test.js'], {
          NODE_REPL_HISTORY: path,
        });
        expect(result).toHaveProperty('signal', null);
        expect(result.errs).toHaveLength(0);
        // expect(result).toHaveProperty('code', 0); FIXME
        expect(result.stdoutMonitor).toHaveBeenCalledWith(
          expect.stringContaining('REPL session history will not be persisted'),
        );
      },
      {
        mode: 0o0200,
        prefix: '.node_repl_history_',
      },
    );
  },
);
