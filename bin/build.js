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
import {builtinModules} from 'module';
import {bundles} from '../src/bundles';
import {fatal, step} from '../lib/log';
import {isRunningFrom} from '../lib/cli';
import {minify} from 'terser';
import {postcssPlugins} from '../postcss.config';
import {rollup} from 'rollup';
import {withoutExtension} from '../lib/path';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import fs from 'fs-extra';
import ignore from 'rollup-plugin-ignore';
import importAlias from 'rollup-plugin-import-alias';
import nodeResolve from 'rollup-plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';

const src = name => `src/${name}.js`;
const dist = name => `dist/${name}.js`;

/**
 * Modules that are problematic to import in a browser context so they are
 * stripped out.
 */
const ignoredModules = ['fs-extra', ...builtinModules];

/**
 * Dependencies that are problematic to import in a node context directly.
 * These live in lib/runtime-deps, named by convention:
 *  - lib/runtime-deps/NAME.js - exported dependency
 *  - lib/runtime-deps/NAME-shaken.js - pre-shaken dependency to aid rollup
 */
const runtimeDeps = async () =>
  (await fs.readdir('lib/runtime-deps'))
    .filter(
      filename => filename.endsWith('.js') && !filename.endsWith('-shaken.js')
    )
    .map(filename => `lib/runtime-deps/${withoutExtension(filename)}`);

const inputConfig = async name => ({
  plugins: [
    babel({runtimeHelpers: true}),
    commonjs(),
    ignore(ignoredModules),
    importAlias({Paths: await moduleAliases(name)}),
    nodeResolve(),
    postcss({extract: true, plugins: postcssPlugins()}),
  ],
});

const outputConfigs = [{format: 'iife'}];

const minifyConfig = {
  compress: {unsafe_arrows: true},
  mangle: {toplevel: true, properties: {regex: /_$/}},
  output: {comments: 'some'},
};

const moduleAliases = async name => ({
  // Magic to connect generic `lib/bundle` to any component.
  '[@component]': src(name),

  // Alias indirect dependencies to shaken dependencies directly.
  ...(await shakenRuntimeDepsAliases()),
});

async function shakenRuntimeDepsAliases() {
  const aliases = {};
  for (const module of await runtimeDeps()) {
    const shaken = `${module}-shaken.js`;
    if (await fs.exists(shaken)) {
      // go back once since bundle entry points are in the `src/` dir.
      aliases[`../${module}`] = shaken;
    }
  }
  return aliases;
}

const withAllBundles = cb => Promise.all(bundles.map(cb));

async function minifyBundle(filename) {
  const file = dist(filename);
  const content = (await fs.readFile(file)).toString('utf-8');
  return fs.outputFile(file, minify(content, minifyConfig).code);
}

export const build = () =>
  step('🚧 Building', () =>
    withAllBundles(async name => {
      const input = 'lib/bundle.js';
      const bundle = await rollup({input, ...(await inputConfig(name))});
      return Promise.all(
        outputConfigs.map(outputConfig =>
          bundle.write({file: dist(name), ...outputConfig})
        )
      );
    })
  );

async function main() {
  await build();
  if (!process.env.PROD) {
    return;
  }
  await step('👶 Minifying', () => withAllBundles(minifyBundle));
}

if (isRunningFrom('build.js')) {
  main().catch(fatal);
}
