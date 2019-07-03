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
import {assert} from '../lib/assert';
import {getNamespace} from '../lib/namespace';
import {successfulFetch} from './utils/xhr';

export const templateFileUrl = (templateName, filename) =>
  `/static/templates/${templateName}/${filename}`;

const {s} = getNamespace('editor');

export class TemplateLoader {
  constructor(win, element) {
    this.win = win;
    this.element = element;
    this.templates = JSON.parse(
      assert(element.querySelector(s('script.templates'))).textContent.replace(
        /(&quot\;)/g,
        '"'
      )
    );
    this.content_ = {};
  }

  async fetchTemplateContent(name) {
    if (name in this.content_) {
    }
    if (!(name in this.content_)) {
      const contentUrl = templateFileUrl(name, 'index.html');
      const contentResponse = await successfulFetch(this.win, contentUrl);
      this.content_[name] = contentResponse.text();
    }
    return this.content_[name];
  }
}
