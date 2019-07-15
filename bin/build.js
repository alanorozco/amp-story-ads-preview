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
import {argv, isDevBuild, isRunningFrom, whenMinified} from '../lib/cli';
import {blue, cyan, magenta, yellow} from 'colors/safe';
import {builtinModules} from 'module';
import {bundles, routes} from '../src/bundles';
import {englishEnumeration} from '../lib/english-enumeration';
import {error, fatal, log, step} from '../lib/log';
import {minify as htmlMinify} from 'html-minifier';
import {htmlMinifyConfig} from '../lib/html-minify-config';
import {minify as jsMinify} from 'terser';
import {jsMinifyConfig} from '../lib/js-minify-config';
import {localBabelPlugin} from '../babel.config';
import {postcssPlugins} from '../postcss.config';
import {renderableBundle, renderBundleToString} from '../lib/renderables';
import {rollup, watch as rollupWatch} from 'rollup';
import {serve} from './serve';
import {withoutExtension} from '../lib/path';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import fs from 'fs-extra';
import glob from 'fast-glob';
import ignore from 'rollup-plugin-ignore';
import nodeResolve from 'rollup-plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import replace from 'rollup-plugin-replace';
import ws from 'ws';

const src = name => `src/${name}.js`;
const dist = name => `dist/${name}.js`;

/**
 * Modules that are problematic to import in a browser context so they are
 * stripped out.
 */
const ignoredModules = ['fs-extra', 'html-minifier', ...builtinModules];

/**
 * Dependencies that are problematic to import in a node context directly.
 * These live in lib/runtime-deps, named by convention:
 *  - lib/runtime-deps/NAME.js - exported dependency
 *  - lib/runtime-deps/NAME-shaken.js - pre-shaken dependency to aid rollup
 */
const runtimeDeps = async () =>
  (await glob(['lib/runtime-deps/**/*.js', '!**/*-shaken.js'])).map(
    filename => `lib/runtime-deps/${withoutExtension(filename)}`
  );

const alias = aliases => ({
  resolveId: (importee, _) => (importee in aliases ? aliases[importee] : null),
});

const litHtmlMinifierBabelPlugin = [
  'template-html-minifier',
  {
    htmlMinifier: {
      ...htmlMinifyConfig,
      // for element props:
      caseSensitive: true,
      // override since they should not be used with lit-html:
      collapseBooleanAttributes: false,
      sortClassName: false,
      sortAttributes: false,
    },
    modules: {'lit-html': ['html', 'svg']},
  },
];

const inputConfig = async name => ({
  // TODO(alanorozco): Revert back generic executable model (it was nice.)
  // With incremental builds, the entry point gets excluded from watching since
  // the import is aliased.
  input: 'src/editor-exec.js',
  plugins: [
    alias(await moduleAliases(name)),
    babel({
      runtimeHelpers: true,
      exclude: 'node_modules/**',
      plugins: [
        ...whenMinified(() => litHtmlMinifierBabelPlugin),
        ...whenMinified(() => localBabelPlugin('normalize-licenses')),
        ...whenMinified(() => localBabelPlugin('minify-assert')),
        ...whenMinified(() => localBabelPlugin('minify-inline-js')),
      ],
    }),
    commonjs(),
    ignore(ignoredModules),
    nodeResolve(),
    postcss({extract: true, plugins: postcssPlugins()}),
    ...whenMinified(() =>
      replace({
        include: 'lib/is-dev.js',
        'IS_DEV = true': 'IS_DEV = false',
      })
    ),
  ],
});

const outputConfigs = [{format: 'iife', sourcemap: isDevBuild()}];

/**
 * Magic below.
 * Aliases browser bundles to:
 * - map generic lib/bundle.js executable to any component module.
 * - allow universal lit-html.
 * - allow including browser-only dependencies from node.
 */
const moduleAliases = async name => ({
  ...genericExecBundleAlias(name),
  ...(await twoWayLitHtmlAliases()),
  ...(await shakenRuntimeDepsAliases()),
});

/** Connects generic executable `lib/bundle` to any component module.  */
const genericExecBundleAlias = name => ({'[@component]': src(name)});

/**
 * Two-way aliasing hack for universal `lit-html`:
 * `lit-html` is actually `@popeindustries/lit-html-server`.
 * `lit-html-browser` is actually `lit-html`.
 */
async function twoWayLitHtmlAliases() {
  const nodeModuleBase = 'node_modules/lit-html-browser';
  const aliases = {'lit-html': `${nodeModuleBase}/lit-html.js`};
  for (const directive of await glob(`${nodeModuleBase}/directives/*.js`)) {
    aliases[`lit-html/directives/${withoutExtension(directive)}`] = directive;
  }
  return aliases;
}

/**
 * Alias indirect browser-only dependencies to shaken dependencies.
 *
 * Browser only dependencies are included indirecly (two-levels deep). With a
 * module `browser-only` that conditionally imports `browser-only-shaken` like:
 *
 * ```
 *   module.exports = 'window' in this ? require('./browser-only-shaken') : {};
 * ```
 *
 * `browser-only-shaken` imports what we need via esm syntax (for better
 * rollup tree-shaking):
 *
 * ```
 *   import {whatINeed} from 'browser-only-dependency';
 *   export {whatIneed};
 * ```
 *
 * So this aliases `browser-only` to `browser-only-shaken` to prevent the
 * conditional code from leaking.
 */
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

const withAllBundles = cb =>
  Promise.all(Object.entries(bundles).map(([...args]) => cb(...args)));

async function minifyBundle(filename) {
  const file = dist(filename);
  const unminified = (await fs.readFile(file)).toString('utf-8');
  const {code} = jsMinify(unminified, jsMinifyConfig);
  return fs.outputFile(file, code);
}

export async function build() {
  await copyStaticAssets();
  await buildTemplatesJson();
  await step('🚧 Building js', () =>
    withAllBundles(async name => {
      const bundle = await rollup(await inputConfig(name));
      return Promise.all(
        outputConfigs.map(outputConfig =>
          bundle.write({file: dist(name), ...outputConfig})
        )
      );
    })
  );
  await freezeStaticHtml();
}

const copyStaticAssets = () =>
  step('📋 Copying static assets', () => fs.copy('static', 'dist/static'));

const buildTemplatesJson = () =>
  step('💅 Generating templates json', async () => {
    const root = 'static/templates';
    const result = {};

    for (const name of await fs.readdir(root)) {
      let previewExt;
      let files;

      const shouldIncludeFile = file => {
        if (file.startsWith('_preview')) {
          if (file.startsWith(/* note ending `.` */ '_preview.')) {
            previewExt = file.split('.').pop();
          }
          return false;
        }
        return !/(^\.|\.(html|txt|md)$)/.test(file);
      };

      try {
        files = (await fs.readdir(`${root}/${name}`)).filter(shouldIncludeFile);
      } catch (_) {
        continue;
      }

      result[name] = {files, previewExt};
    }

    return fs.outputJson('dist/templates.json', result).catch(fatal);
  });

const freezeStaticHtml = (opts = {}) =>
  step('❄️ Freezing static html', () =>
    Promise.all(
      Object.entries(routes).map(entry => freezeStaticHtmlRoute(...entry, opts))
    )
  );

async function freezeStaticHtmlRoute(route, bundleModule, {reloadPort}) {
  const htmlFilename = `dist/${routeToStaticPath(route)}`;
  const htmlContentRaw = await renderBundleToString(
    renderableBundle(bundleModule, {relToDist: '/'})
  );
  const htmlContent = reloadPort
    ? htmlContentRaw.replace(/<body/, `<body data-reload-port="${reloadPort}" `)
    : htmlContentRaw;
  return fs.writeFile(htmlFilename, htmlContent);
}

function routeToStaticPath(route) {
  route = route.replace(/\/$/, '/index').replace(/^\//, '');
  if (!route.endsWith('.html')) {
    return `${route}.html`;
  }
  return route;
}

const minifyHtml = async () =>
  Promise.all(
    (await glob(['dist/**/*.html', '!**/templates/**'])).map(async filename => {
      const unminified = (await fs.readFile(filename)).toString('utf-8');
      const minified = htmlMinify(unminified, htmlMinifyConfig);
      return fs.outputFile(filename, minified);
    })
  );

function broadcast(wss, data) {
  const serialized = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState != ws.OPEN) {
      return;
    }
    client.send(serialized);
  }
}

async function incrementalBuild() {
  const cwd = process.cwd();

  const {reloadPort = 8080} = argv;

  const removeAbsoluteAndDist = f => f.replace(`${cwd}/dist/`, '');
  const formatOutput = items =>
    blue(englishEnumeration(items.map(removeAbsoluteAndDist)));

  let serving = false;

  let clientNotificationWss;

  const eventHandlers = {
    FATAL: fatal,
    ERROR: () => {
      error(...arguments);
      broadcast(clientNotificationWss, {error: true});
    },
    START: async () => {
      await copyStaticAssets();
      await buildTemplatesJson();
      log(yellow('🚧 Starting incremental build...'));
    },
    BUNDLE_START: ({output}) => {
      log(magenta(`👷 Building ${formatOutput(output)}...`));
    },
    BUNDLE_END: ({output}) => {
      log(cyan(`✨ Done building ${formatOutput(output)}.`));
    },
    END: async () => {
      await freezeStaticHtml({reloadPort});
      clientNotificationWss =
        clientNotificationWss || new ws.Server({port: reloadPort});
      broadcast(clientNotificationWss, {built: true});
      if (serving) {
        return;
      }
      serve();
      serving = true;
    },
  };

  rollupWatch(
    await withAllBundles(async name => ({
      ...(await inputConfig(name)),
      output: outputConfigs.map(outputConfig => ({
        file: dist(name),
        ...outputConfig,
      })),
      watch: {
        chokidar: true,
        exclude: ['node_modules/**'],
        include: ['lib/**', 'src/**'],
      },
    }))
  ).on('event', async function(event) {
    const {code} = event;
    if (code in eventHandlers) {
      eventHandlers[code](event);
    }
  });
}

async function main() {
  if (argv.watch) {
    return incrementalBuild();
  }
  await build();
  if (!argv.minify) {
    return;
  }
  await step('👶 Minifying', () =>
    Promise.all([withAllBundles(minifyBundle), minifyHtml()])
  );
}

if (isRunningFrom('build.js')) {
  main().catch(fatal);
}
