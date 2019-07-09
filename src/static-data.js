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
import {htmlMinifyConfig} from '../lib/html-minify-config';
import fs from 'fs-extra';
import htmlMinifier from 'html-minifier';

export const readFileString = async name =>
  (await fs.readFile(name)).toString('utf-8');

export const readFixtureHtml = name =>
  readFileString(`src/fixtures/${name}.html`);

export const minifyHtml = html => htmlMinifier.minify(html, htmlMinifyConfig);
