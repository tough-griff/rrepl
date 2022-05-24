#!/usr/bin/env node

/** @typedef {import("repl").REPLServer} REPLServer */
/** @typedef {import("vm").Context} Context */

const chalk = require('chalk');
const _ = require('lodash');

/**
 * Default value callback, returns a number based on index, starting with 1.
 * @param {number} n
 * @returns {number}
 */
const defaultValCb = (n) => n + 1;

/**
 * Default key callback, returns a string based on index, starting with `'a'`.
 * @param {number} n
 * @returns {string}
 */
const defaultKeyCb = (n) => String.fromCharCode(96 + (n + 1));

/**
 * Configure REPL context with our globals.
 * @param {Context} context
 */
const init = (context) => {
  const lodash = _.runInContext(context);

  Object.defineProperties(context, {
    Array: {
      value: Array,
    },
    _: {
      value: lodash,
    },
    lodash: {
      value: lodash,
    },
    Object: {
      value: Object,
    },
  });
};

/**
 * Configure our REPL on startup. Adds some commonly used globals and a few
 * utility methods.
 *
 * @param {REPLServer} repl
 */
module.exports.rrepl = function configure(repl) {
  repl.setPrompt(`${process.version} ${chalk.green('❯')} `);

  init(repl.context);
  repl.on('reset', init);

  Object.defineProperty(repl.context.Array, 'toy', {
    /**
     * Generates an array of length `n` with values generated by the provided
     * callback.
     * @template T
     * @param {number} n
     * @param {(n: number) => T} valCb
     * @returns {T[]}
     */
    value: function toy(n = 10, valCb = defaultValCb) {
      return repl.context._.times(n, valCb);
    },
  });

  Object.defineProperty(repl.context.Object, 'toy', {
    /**
     * Generates an object with `n` key value pairs. Each key and value is
     * generated by a provided callback.
     * @template T
     * @param {number} n
     * @param {(n: number) => string} keyCb
     * @param {(n: number) => T} valCb
     * @returns {{ [key: string]: T }}
     */
    value: function toy(n = 10, keyCb = defaultKeyCb, valCb = defaultValCb) {
      const keyArray = Array.toy(n, keyCb);
      const valArray = Array.toy(n, valCb);

      return repl.context._.zipObject(keyArray, valArray);
    },
  });
};
