/**
 * Copyright 2019 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {argv, isRunningFrom} from '../lib/cli';
import babel from 'rollup-plugin-babel';
import colors from 'colors/safe';
import commonjs from 'rollup-plugin-commonjs';
import log from 'fancy-log';
import resolve from 'rollup-plugin-node-resolve';
import rollup from 'rollup';

const {blue, magenta} = colors;

const input = 'src/app.mjs';

const plugins = [
  resolve(),
  commonjs(),
  babel({exclude: 'node_modules/**', runtimeHelpers: true}),
];

const bundles = [
  {
    file: 'dist/app.js',
    format: 'iife',
    name: 'ampStoryAdPreview',
  },
];

export async function build() {
  if (!argv.quiet) {
    log(magenta('🚧 Building...'));
  }
  const bundle = await rollup.rollup({input, plugins});
  await Promise.all(bundles.map(options => bundle.write(options)));
  if (!argv.quiet) {
    log(blue('✨ Built.'));
  }
}

if (isRunningFrom('build.mjs')) {
  build();
}
