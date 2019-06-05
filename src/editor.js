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
import './editor.css';
import './monokai.css';
import {getNamespace} from '../lib/namespace';
import AmpStoryAdPreview from './amp-story-ad-preview';
import codemirror from '../lib/runtime-deps/codemirror';
import fs from 'fs-extra';

const NOOP = () => {};

const defaultContent = 'src/editor-default.html';

const {id, n, s} = getNamespace('editor');

export {id};

export async function data() {
  const content = (await fs.readFile(defaultContent)).toString('utf-8');
  return {content};
}

export function render(
  context,
  {content, isHidden = false, handleToggle = NOOP}
) {
  const {html} = context;
  return html`
    <div id="${id}" class="${n('wrap')}">
      ${[
        Textarea(context, {content, isHidden}),
        Toggle(context, {handleToggle}),
        Preview(context),
      ]}
    </div>
  `;
}

function Preview({html}) {
  return html`
    <div class="${n('preview')}"></div>
  `;
}

function Textarea({html}, {content, isHidden}) {
  return html`
    <div class="${n('textarea')}" ?hidden=${isHidden}>
      <textarea>${content}</textarea>
    </div>
  `;
}

function Toggle({html}, {handleToggle}) {
  return html`
    <div id="${n('toggle')}" @click=${handleToggle}>
      X
    </div>
  `;
}

class Editor {
  constructor(context, element) {
    this.context = context;
    this.isFullPreview_ = false;
    this.generateTemplate = render;

    const textarea = element.querySelector('textarea');
    const preview = element.querySelector(s('.preview'));

    this.codeMirror_ = codemirror.fromTextArea(textarea, {
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

    this.preview_ = new AmpStoryAdPreview(this.context, preview);

    this.updatePreview_();
    this.codeMirror_.on('change', () => this.updatePreview_());
    this.hydrate_();
  }

  updatePreview_() {
    this.preview_.update(this.codeMirror_.getValue());
  }

  hydrate_() {
    const template = this.generateTemplate(this.context, {
      isHidden: this.isFullPreview_,
      handleToggle: this.handleToggle_.bind(this),
    });
    this.context.render(template, this.context.win.document.body);
  }

  handleToggle_() {
    this.isFullPreview_ = !this.isFullPreview_;
    this.hydrate_();
  }
}

export {Editor as ctor};
