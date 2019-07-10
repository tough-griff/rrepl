# rrepl [![npm](https://img.shields.io/npm/v/rrepl.svg)](https://www.npmjs.com/package/rrepl)
> An improved node REPL with support for configuration.

## Usage
```sh
npm install -g rrepl
rrepl
```
OR
```sh
npx rrepl
```

## Configuration
Add a `.noderc` file in your home directory

```js
module.exports = (repl) => {
  repl.setPrompt('>> ');
};
```

You can pass additional arguments to `node` with the
[`NODE_OPTIONS`](https://nodejs.org/api/cli.html#cli_node_options_options)
environment variable. For example, run:
```sh
env NODE_OPTIONS="--experimental-repl-await" rrepl
```
to enable top-level await keyword support.
