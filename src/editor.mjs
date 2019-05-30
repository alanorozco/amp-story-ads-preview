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

import {getNamespace} from '../lib/namespace';

const {id, n} = getNamespace('editor');

const Preview = ({html}) =>
  html`
    <div class="${n('preview-wrap')}">
      <div class="${n('preview')}"></div>
    </div>
  `;

const Textarea = ({html}, {content}) =>
  html`
    <div class="${n('textarea-wrap')}">
      <textarea>${content}</textarea>
    </div>
  `;

export function renderEditor(context, {content}) {
  const {html} = context;
  return html`
    <div id="${id}" class="${n('wrap')}">
      ${[Textarea(context, {content}), Preview(context)]}
    </div>
  `;
}

export default class Editor {
  constructor({deps}) {
    this.codeMirror_ = deps.CodeMirror.fromTextArea(
      document.querySelector(`#${id} textarea`),
      {mode: 'htmlmixed'}
    );
  }
}
