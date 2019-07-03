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

/**
 * Holds CodeMirror HTML autocompletion specs for AMP formats.
 * This is taken from amp.dev and is built from the AMP spec... somehow.
 */
export const hintsUrl = '/static/hints/amphtml-hint.json';

/**
 * Hints ignored on typing when delimited by these chars.
 * Stolen from @ampproject/docs/playground/src/editor/editor.js
 */
export const hintIgnoreEnds = new Set([
  ';',
  ',',
  ')',
  '`',
  '"',
  "'",
  '>',
  '{',
  '}',
  '[',
  ']',
]);

/**
 * tagName-to-attributes for uploaded file autocomplete hints.
 * (These only apply to the amp4ads validation set.)
 *
 * TODO(alanorozco): build this set dynamically
 * TODO(alanorozco): set hints for tag context based on file extension
 */
const attrFileHintTagAttrs = {
  'amp-img': ['src'],
  'amp-anim': ['src'],
  'amp-video': ['src', 'poster'],
  'amp-audio': ['src'],
  'source': ['src'],
  'track': ['src'],
};

const attrFileHintTagNames = Object.keys(attrFileHintTagAttrs);

export function setAttrFileHints(codemirrorHtmlSchema, urls) {
  // CodeMirror HTML spec allows null for attributes without known values.
  const valueSet = urls.length > 0 ? urls : null;

  for (const tagName of attrFileHintTagNames) {
    if (!(tagName in codemirrorHtmlSchema)) {
      // spec not populated yet, exec again when fetched.
      return;
    }
    for (const attr of attrFileHintTagAttrs[tagName]) {
      codemirrorHtmlSchema[tagName].attrs[attr] = valueSet;
    }
  }
}
