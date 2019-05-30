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
import {renderEditor} from '../src/editor';
import {Script, Style} from '../src/template';
import {sendRenderable} from './routes-helpers';
import express from 'express';
import fs from 'fs-extra';

const staticRoutes = ['dist', 'static'];

export function route(server) {
  for (const staticDir of staticRoutes) {
    server.use(`/${staticDir}`, express.static(staticDir));
  }

  server.get('/', async (unusedRequest, response) => {
    const editorBundlePrefix = 'dist/editor-bundle';
    const content = await fs.readFile('src/editor-default.html');
    const css = await fs.readFile(`${editorBundlePrefix}.css`);

    return sendRenderable(response, {
      head: context => [
        Script(context, {src: `${editorBundlePrefix}.js`}),
        Style(context, {css}),
      ],
      body: context => renderEditor(context, {content}),
    });
  });

  return server;
}
