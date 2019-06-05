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
import './global.css';
import './monokai.css';
import codemirror from '../lib/runtime-deps/codemirror';

export default class EditorContent {
  constructor(context, element) {
    this.context = context;
    this.element = element;

    this.text = element.querySelector('textarea');
    this.codeMirror_ = codemirror.fromTextArea(this.text, {
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
      theme: 'monokai',
    });
  }

  fullPreview_(element) {
    if (element.hasAttribute('hidden')) {
      element.removeAttribute('hidden');
    } else {
      element.setAttribute('hidden', '');
    }
  }
}
