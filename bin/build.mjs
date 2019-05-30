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
import {error, log} from '../lib/log';
import {isRunningFrom} from '../lib/cli';
import babel from 'rollup-plugin-babel';
import colors from 'colors/safe';
import commonjs from 'rollup-plugin-commonjs';
import cssnano from 'cssnano';
import fs from 'fs-extra';
import nodeResolve from 'rollup-plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import rollup from 'rollup';
import terser from 'terser';

const {blue, magenta} = colors;

const {PROD = false} = process.env;

const minifyConfig = {mangle: {toplevel: true}};

function inputConfig() {
  const cssNanoOnProd = PROD ? [cssnano()] : [];
  return {
    input: 'src/app.mjs',
    plugins: [
      postcss({extract: true, plugins: [...cssNanoOnProd]}),
      nodeResolve(),
      commonjs(),
      babel({runtimeHelpers: true}),
    ],
  };
}

const outputBundles = [
  {
    file: 'dist/app.js',
    format: 'iife',
    name: 'ampStoryAdPreview',
  },
];

export async function build() {
  log(magenta('🚧 Building...'));
  const bundle = await rollup.rollup(inputConfig());
  await Promise.all(outputBundles.map(options => bundle.write(options)));
  log(blue('✨ Built.'));
  if (!PROD) {
    return;
  }
  minify();
}

async function minify() {
  log(magenta('👶 Minifying...'));
  await Promise.all(
    outputBundles.map(async ({file}) => {
      const input = (await fs.readFile(file)).toString('utf-8');
      const {code} = terser.minify({[file]: input}, minifyConfig);
      return fs.outputFile(file, code);
    })
  );
  log(blue('✨ Minified.'));
}

if (isRunningFrom('build.mjs')) {
  build().catch(error);
}
