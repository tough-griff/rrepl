# rrepl

[![npm](https://img.shields.io/npm/v/rrepl)](https://www.npmjs.com/package/rrepl)
[![build](https://img.shields.io/github/workflow/status/tough-griff/rrepl/Test)](https://github.com/tough-griff/rrepl/actions/workflows/test.yml)
[![codecov](https://img.shields.io/codecov/c/github/tough-griff/rrepl)](https://codecov.io/gh/tough-griff/rrepl)

> An improved node REPL with support for configuration.

## Usage

```sh
npm install -g rrepl
rrepl
```

or

```sh
npx rrepl
```

## Configuration

Add a `.noderc` file in your home directory. You can also specify a different
configuration file with the `-c` or `--config` option. The `.noderc` file should
export a function named rrepl which takes a
[`REPLServer`](https://nodejs.org/api/repl.html#repl_class_replserver) instance
as its argument. This callback is invoked when `rrepl` is run, thus configuring
your environment.

```js
module.exports.rrepl = (repl) => {
  repl.setPrompt('>> ');
};
```

See [_.noderc.example.js_](https://github.com/tough-griff/rrepl/blob/main/.noderc.example.js)
as a sample of what you can do with `rrepl`!

### NODE_OPTIONS

You can pass additional arguments to `node` with the
[`NODE_OPTIONS`](https://nodejs.org/api/cli.html#cli_node_options_options)
environment variable. For example, run:

```sh
env NODE_OPTIONS="--experimental-repl-await" rrepl
```

to enable top-level await keyword support.

## Programmatic Usage

Furthermore, you can programmatically create a repl with the following:

```js
import { createRepl } from 'rrepl';
// or
const { createRepl } = require('rrepl');

const repl = await createRepl();
```
