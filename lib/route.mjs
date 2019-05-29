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
import {Scaffold} from '../src/template';
import express from 'express';
import litHtmlServer from '@popeindustries/lit-html-server';

const {html, renderToStream} = litHtmlServer;

function renderToResponse(response, template, data) {
  const context = {html};
  return renderToStream(template(context, data)).pipe(response);
}

export function route(app) {
  for (const staticDir of ['dist', 'static']) {
    app.use(`/${staticDir}`, express.static(staticDir));
  }

  app.get('/', (_, response) => {
    renderToResponse(response, Scaffold, {body: ''});
  });

  return app;
}
