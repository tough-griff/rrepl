#!/usr/bin/env node

const rrepl = require('.');

(async (process) => {
  try {
    const repl = await rrepl(process);

    // istanbul ignore next
    if (process.send) process.send('init');

    repl.on('exit', () => {
      process.exit(0);
    });
  } catch (err) {
    process.exit(err.code);
  }
})(require('process'));
