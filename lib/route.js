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
import {sendBundle, serveStatic} from './routes-helpers';
import fs from 'fs-extra';

async function handleIndexRequest(unusedRequest, response) {
  const content = await fs.readFile('src/editor-default.html');
  const renderer = context => renderEditor(context, {content});
  return sendBundle(response, 'app', {renderer, js: true, css: true});
}

export function route(server) {
  serveStatic(server, ['dist', 'static']);

  server.get('/', handleIndexRequest);

  return server;
}