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
import {pipeAsPromise} from './stream';
import {renderToStream, renderToString} from './lit-html-server';
import {Scaffold, Script, StyleOptional} from '../src/template';
import fs from 'fs-extra';

export async function writeRenderedToStream(rendered, stream) {
  stream.write('<!DOCTYPE html>');
  stream.write('<html>');
  await pipeAsPromise(renderToStream(rendered), stream);
  stream.end('</html>');
}

export const renderBundleToString = async rendered =>
  ['<!DOCTYPE html>', '<html>', await renderToString(rendered), '</html>'].join(
    '\n'
  );

export function resolveBundle(bundleModule) {
  const [name] = Object.keys(bundleModule);
  const loadedModule = bundleModule[name];
  return {name, loadedModule};
}

export async function renderableBundle(bundleModule) {
  const {name, loadedModule} = resolveBundle(bundleModule);
  const src = `/${name}.js`;
  const script = Script({src});

  const css = `dist/${name}.css`;
  const cssInline = (await fs.exists(css)) ? await fs.readFile(css) : null;
  const styleOptional = StyleOptional({cssInline});

  const head = [script, styleOptional];

  const data = await (loadedModule.data ? loadedModule.data() : {});
  const body = await loadedModule.renderComponent(data);

  return Scaffold({head, body});
}
