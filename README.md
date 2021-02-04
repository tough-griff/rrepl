# rrepl [![npm](https://img.shields.io/npm/v/rrepl.svg)](https://www.npmjs.com/package/rrepl) [![Actions Status](https://github.com/tough-griff/rrepl/workflows/Test/badge.svg)](https://github.com/tough-griff/rrepl/actions) [![codecov](https://codecov.io/gh/tough-griff/rrepl/branch/main/graph/badge.svg)](https://codecov.io/gh/tough-griff/rrepl)

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
export a function which takes a
[`REPLServer`](https://nodejs.org/api/repl.html#repl_class_replserver) instance
as its argument. This callback is invoked when `rrepl` is run, thus configuring
your environment.

```js
module.exports = (repl) => {
  repl.setPrompt('>> ');
};
```

See [_.noderc.example_](https://github.com/tough-griff/rrepl/blob/main/.noderc.example)
as a sample of what you can do with `rrepl`!

### NODE_OPTIONS

You can pass additional arguments to `node` with the
[`NODE_OPTIONS`](https://nodejs.org/api/cli.html#cli_node_options_options)
environment variable. For example, run:

```sh
env NODE_OPTIONS="--experimental-repl-await" rrepl
```

to enable top-level await keyword support.
