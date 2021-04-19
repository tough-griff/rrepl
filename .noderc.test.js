#!/usr/bin/env node

const assert = require('assert').strict;
const { REPLServer } = require('repl');

module.exports = (repl) => {
  try {
    assert.ok(repl instanceof REPLServer);
    console.log('PASS');
  } catch (err) {
    console.error('FAIL');
    console.error(err);
  }
};
