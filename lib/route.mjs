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
import {Scaffold} from '../src/template';
import express from 'express';
import fs from 'fs-extra';
import litHtmlServer from '@popeindustries/lit-html-server';

const {html, renderToStream} = litHtmlServer;

const toPromise = stream => new Promise(resolve => stream.on('end', resolve));

async function sendRenderedTemplate(response, rendered) {
  const stream = renderToStream(rendered);
  const promise = toPromise(stream);
  response.write('<!DOCTYPE html><html>');
  stream.pipe(
    response,
    {end: false}
  );
  await promise;
  response.end('</html>');
}

async function handleEditorRequest(unusedRequest, response) {
  const context = {html};
  const content = await fs.readFile('src/editor-default.html');
  const css = await fs.readFile('dist/app.css');
  const body = renderEditor(context, {content});
  const rendered = Scaffold(context, {css, body});
  await sendRenderedTemplate(response, rendered);
}

export function route(server) {
  for (const staticDir of ['dist', 'static']) {
    server.use(`/${staticDir}`, express.static(staticDir));
  }

  server.get('/', handleEditorRequest);

  return server;
}
