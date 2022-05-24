import { fork } from 'child_process';
import chai, { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

class Result {
  argv: ReadonlyArray<string>;
  env: NodeJS.ProcessEnv;
  code: number | null = null;
  errs: Error[] = [];
  signal: string | null = null;
  stderr: string = '';
  stderrMonitor: SinonStub = sinon.stub();
  stdout: string = '';
  stdoutMonitor: SinonStub = sinon.stub();

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

describe('CLI', function () {
  this.timeout(10_000);

  it('returns an exit code of 0', async function () {
    const result = await rrepl(['-c', '.noderc.test.js']);
    expect(result.errs).to.have.length(0);
    expect(result).to.have.ownProperty('signal', null);
    expect(result).to.have.ownProperty('code', 0);
    expect(result.stderrMonitor).to.have.callCount(0);
  });
});
