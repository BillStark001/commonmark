/* eslint-disable @typescript-eslint/no-var-requires */
// rollup.config.js
const commonjs = require('@rollup/plugin-commonjs');
const resolve = require('@rollup/plugin-node-resolve');
const terser = require('@rollup/plugin-terser');
const dts = require('rollup-plugin-dts').default;
const del = require('rollup-plugin-delete');
const { version } = require('./package.json');

var banner =
    '/* commonmark ' +
    version +
    ' https://github.com/commonmark/commonmark.js @license BSD3 */';

exports.default = [
  {
    input: 'dist/src/index.js',
    output: {
      file: 'dist/commonmark.js',
      format: 'cjs',
      name: 'commonmark',
      banner: banner,
      sourcemap: true,
    },
    plugins: [resolve(), commonjs()],
  },
  {
    input: 'dist/src/index.js',
    output: {
      file: 'dist/commonmark.min.js',
      format: 'iife',
      name: 'commonmark',
      banner: banner,
      sourcemap: true,
    },
    plugins: [resolve(), commonjs(), terser()],
  },
  {
    input: 'dist/src/index.d.ts',
    output: {
      file: 'dist/commonmark.d.ts',
      format: 'es',
    },
    plugins: [
      dts(),
      del({
        targets: ['dist/*/'],
        hook: 'buildEnd',
      }),
    ],
  },
];
