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
import {Deferred} from '../vendor/ampproject/amphtml/src/utils/promise';
import {getNamespace} from '../lib/namespace';
import {html} from 'lit-html';
import {until} from 'lit-html/directives/until';
import {untilAttached} from './utils/until-attached';
import codemirror from '../lib/runtime-deps/codemirror';

const {n, s} = getNamespace('editor');

export const renderEditor = ({codemirrorElement, defaultContent, hidden}) =>
  html`
    <div class=${n('wrap')} ?hidden=${hidden}>
      ${until(codemirrorElement || DefaultContent({defaultContent}))}
    </div>
  `;

/**
 * Renders default editor content to hydrate on runtime.
 * @param {Object} data
 * @param {string=} data.defaultContent
 * @return {lit-html/TemplateResult}
 */
const DefaultContent = ({defaultContent}) => html`
  <textarea class=${n('default-content')}>${defaultContent}</textarea>
`;

export const getDefaultContent = parent =>
  parent.querySelector(s('.default-content')).value;

export class Editor {
  constructor(defaultContent) {
    const {
      promise: codemirrorElement,
      resolve: codemirrorElementResolve,
    } = new Deferred();

    this.codemirrorElement = codemirrorElement;

    this.codemirror_ = new codemirror(codemirrorElementResolve, {
      value: defaultContent,
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

    this.hydrate_();
  }

  async hydrate_() {
    // Render is async, so we need to wait for the codemirror element to be
    // attached in order to refresh and attach events.
    await untilAttached(this.parent_, this.state_.codemirrorElement);
    this.codemirror_.refresh();
  }

  onChange(handler) {
    this.codemirror_.on('change', () => handler(this.codemirror_.getValue()));
  }

  getValue() {
    return this.codemirror_.getValue();
  }
}
