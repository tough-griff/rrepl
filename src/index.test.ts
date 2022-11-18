import chaiAsPromised from 'chai-as-promised';
import chai, { expect } from 'chai';
import os from 'os';
import path from 'path';
import { REPL_MODE_SLOPPY, REPL_MODE_STRICT } from 'repl';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { Readable, Writable } from 'stream';
import RREPL from '.';

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('RREPL', function () {
  let input: Readable;
  let output: Writable;

  beforeEach(function () {
    sinon.stub(console);

    input = new Readable({
      read() {},
    });

    output = new Writable({
      write(_chunk, _encoding, callback) {
        setImmediate(callback);
      },
    });
  });

  afterEach(function () {
    delete process.env.NODE_REPL_MODE;
    delete process.env.NODE_REPL_HISTORY;
    sinon.restore();
  });

  it('configures a RREPL correctly', async function () {
    const result = await RREPL.create({
      config: path.resolve(__dirname, '..', '.noderc.test.js'),
      input,
      output,
    });
    result.close();

    expect(result).to.haveOwnProperty('replMode', REPL_MODE_SLOPPY);
    expect(console.log).to.have.been.calledWith(sinon.match('Welcome'));
  });

  it('configures a strict RREPL', async function () {
    process.env.NODE_REPL_MODE = 'strict';
    const result = await RREPL.create({
      config: path.resolve(__dirname, '..', '.noderc.test.js'),
      input,
      output,
    });
    result.close();

    expect(result).to.haveOwnProperty('replMode', REPL_MODE_STRICT);
  });

  it('properly configures history', async function () {
    process.env.NODE_REPL_HISTORY = path.resolve(__dirname, '..', '.history');
    const result = await RREPL.create({
      config: path.resolve(__dirname, '..', '.noderc.test.js'),
      verbose: true,
      input,
      output,
    });
    result.close();

    expect(result).to.haveOwnProperty('history').with.length(4);
    expect(console.log).to.have.been.calledWith(
      sinon.match('Configuring history at'),
    );
  });

  it('properly disables history', async function () {
    process.env.NODE_REPL_HISTORY = '';
    const result = await RREPL.create({
      config: path.resolve(__dirname, '..', '.noderc.test.js'),
      verbose: true,
      input,
      output,
    });
    result.close();

    expect(result).to.haveOwnProperty('history').with.length(0);
    expect(console.log).to.have.been.calledWith(
      sinon.match('Skipping history setup'),
    );
  });

  it('properly logs when a config file does not export the correct function', async function () {
    const result = await RREPL.create({
      config: path.resolve(__dirname, '..', '.noderc.nofunc.test.js'),
      verbose: true,
      input,
      output,
    });
    result.close();

    expect(result).to.haveOwnProperty('replMode', REPL_MODE_SLOPPY);
    expect(console.log).to.have.been.calledWith(
      sinon.match('did not export a `rrepl` function'),
    );
  });

  it('defaults to ~/.noderc', async function () {
    const result = await expect(
      RREPL.create({
        verbose: true,
        input,
        output,
      }),
    ).not.to.have.rejected;
    result.close();

    expect(console.log).to.have.been.calledWith(sinon.match(os.homedir));
  });

  it('handles a bad config file', async function () {
    const result = await RREPL.create({
      config: path.resolve(__dirname, '..', '.noderc.throws.test.js'),
      input,
      output,
    });
    result.close();

    expect(console.error).to.have.been.calledWith(
      sinon.match('An error occurred while loading configuration at'),
    );
  });

  it('handles a bad config file with no exported function', async function () {
    const result = await RREPL.create({
      config: path.resolve(__dirname, '..', '.noderc.throws.nofunc.test.js'),
      input,
      output,
    });
    result.close();

    expect(console.error).to.have.been.calledWith(
      sinon.match('An error occurred while loading configuration at'),
    );
  });

  it('handles a nonexistent config file', async function () {
    const result = await RREPL.create({
      config: path.resolve(__dirname, '..', '.noderc.noexists.js'),
      verbose: true,
      input,
      output,
    });
    result.close();

    expect(console.log).to.have.been.calledWith(
      sinon.match('No configuration found'),
    );
  });
});
