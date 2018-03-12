import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import progress from 'rollup-plugin-progress'
import json from 'rollup-plugin-json'
import pkg from './package.json'

export default {
  input: 'src/index.js',
  output: [
    { file: pkg.main, format: 'cjs' },
    { file: pkg.module, format: 'es' }
  ],
  plugins: [
    progress(),
    json(),
    babel({ exclude: 'node_modules/**', plugins: ['external-helpers'] }),
    resolve({
      browser: true
    }),
    commonjs()
  ],
  sourcemap: true
}
