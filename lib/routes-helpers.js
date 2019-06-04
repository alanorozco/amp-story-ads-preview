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
import {html, renderToStream} from '@popeindustries/lit-html-server';
import {ifDefined} from '@popeindustries/lit-html-server/directives/if-defined';
import {pipeAsPromise} from './stream';
import {Scaffold, Script, Style} from '../src/template';
import express from 'express';
import fs from 'fs-extra';

const directives = {ifDefined};

export const createTemplateContext = () => ({html, directives});

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

export function sendBundle(response, name, {js, css, renderer}) {
  const dist = `dist/${name}`;
  const head = async context => {
    const head = [];
    if (js) {
      const src = `${dist}.js`;
      head.push(Script(context, {src}));
    }
    if (css) {
      const src = `${dist}.css`;
      const cssInline = await fs.readFile(src);
      head.push(Style(context, {css: cssInline}));
    }
    return head;
  };
  const body = context => renderer(context);
  return sendRenderable(response, {head, body});
}

export function serveStatic(server, dirs) {
  for (const dir of dirs) {
    server.use(`/${dir}`, express.static(dir));
  }
}
