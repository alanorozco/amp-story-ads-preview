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
import {Scaffold} from '../src/template';
import litHtmlServer from '@popeindustries/lit-html-server';

const {html, renderToStream} = litHtmlServer;

export const createTemplateContext = () => ({html});

export async function sendRenderable(response, {head, body}) {
  const context = createTemplateContext();
  const rendered = Scaffold(context, {
    head: head(context),
    body: body(context),
  });
  response.write('<!DOCTYPE html><html>');
  await pipeAsPromise(renderToStream(rendered), response);
  response.end('</html>');
}
