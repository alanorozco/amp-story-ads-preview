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
import {minifyInlineJs} from './utils/minify-inline-js';

const httpsCircumventionPatch = minifyInlineJs(`
  (doc => {
    const createElement = doc.createElement;
    doc.createElement = function(tagName) {
      const el = createElement.apply(doc, arguments);
      if (/^a$/i.test(tagName)) {
        Object.defineProperty(el, 'protocol', {value: 'https:'});
      }
      return el;
    };
  })(document);
  `);

const blobCorsPatch = minifyInlineJs(`
  (win => {
    const realFetch = win.fetch;
    win.fetch = function(url) {
      const args = Array.prototype.slice.call(arguments);
      if (url.startsWith('blob:')) {
        args[0] = url.split('?')[0];
      }
      return realFetch.apply(win, args);
    }
  })(window);
`);

const addContentToHead = (docStr, headContent) =>
  docStr.replace('<head>', `<head><script>${headContent}</script>`);

const insertHttpsCircumventionPatch = docStr =>
  addContentToHead(docStr, httpsCircumventionPatch);

const insertBlobCorsPatch = docStr => addContentToHead(docStr, blobCorsPatch);

/**
 * Patches an <amp-story>  document string for REPL support:
 * - Monkey-patches `document.createElement()` to circumvent AMP's HTTPS checks.
 * - Monkey-patches `window.fetch()` to allow blob url without adding amp cors param.
 * @param {string} docStr
 * @return {string}
 */
export const patchStoryDoc = docStr =>
  insertHttpsCircumventionPatch(insertBlobCorsPatch(docStr));
