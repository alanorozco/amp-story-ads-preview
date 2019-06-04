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
import AmpStoryAdPreview from './amp-story-ad-preview';

const {id, n, s} = getNamespace('editor');

export {id as editorId};

export function renderEditor(context, {content}) {
  const {html} = context;
  return html`
    <div id="${id}" class="${n('wrap')}">
      ${[Textarea(context, {content}), Preview(context)]}
    </div>
  `;
}

function Preview({html}) {
  return html`
    <div class="${n('preview')}"></div>
  `;
}

function Textarea({html}, {content}) {
  return html`
    <div class="${n('textarea')}">
      <textarea>${content}</textarea>
    </div>
  `;
}

export default class Editor {
  constructor(context, deps, element) {
    this.context = context;
    this.deps_ = deps;

    this.codeMirror_ = this.initCodeMirror_(element.querySelector('textarea'));
    this.preview_ = this.initPreview_(element.querySelector(s('.preview')));

    this.updatePreview_();
    this.codeMirror_.on('change', () => this.updatePreview_());
  }

  initCodeMirror_(textarea) {
    return this.deps_.CodeMirror.fromTextArea(textarea, {
      mode: 'text/html',
      selectionPointer: true,
      styleActiveLine: true,
      lineNumbers: false,
      showCursorWhenSelecting: true,
      cursorBlinkRate: 300,
      autoCloseBrackets: true,
      autoCloseTags: true,
      gutters: ['CodeMirror-error-markers'],
      extraKeys: {'Ctrl-Space': 'autocomplete'},
      hintOptions: {
        completeSingle: false,
      },
    });
  }

  initPreview_(container) {
    const {purifyHtml} = this.deps_;
    const deps = {purifyHtml};
    return new AmpStoryAdPreview(this.context, deps, container);
  }

  updatePreview_() {
    this.preview_.update(this.codeMirror_.getValue());
  }
}
