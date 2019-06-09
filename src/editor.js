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
import {appliedState} from './applied-state';
import {Deferred} from '../vendor/ampproject/amphtml/src/utils/promise';
import {getNamespace} from '../lib/namespace';
import {html, render} from 'lit-html';
import {until} from 'lit-html/directives/until';
import AmpStoryAdPreview from './amp-story-ad-preview';
import codemirror from '../lib/runtime-deps/codemirror';
import fs from 'fs-extra';

const defaultContentPath = 'src/editor-default.html';

const {id, n, s} = getNamespace('editor');

export {id};

const attachedOnRuntime = new Promise(() => {});

export const data = async () => ({
  isContentHidden: false,
  defaultContent: (await fs.readFile(defaultContentPath)).toString('utf-8'),
  codemirrorElement: attachedOnRuntime,
  previewElement: attachedOnRuntime,
  toggleContent: null, // event handler
});

export const renderComponent = ({
  defaultContent,
  isContentHidden,
  codemirrorElement,
  previewElement,
  toggleContent,
}) => html`
  <div id=${id} class=${n('wrap')}>
    ${Content({defaultContent, codemirrorElement, isContentHidden})}
    ${ContentToggleButton({toggleContent, isContentHidden})}
    ${until(previewElement, Preview())}
  </div>
`;

const Preview = () => html`
  <div class=${n('preview')}></div>
`;

const ContentToggleButton = ({toggleContent, isContentHidden}) => html`
  <div @click=${toggleContent} class=${n('content-toggle')}>
    ${isContentHidden ? '>' : '<'}
  </div>
`;

const Content = ({defaultContent, codemirrorElement, isContentHidden}) => html`
  <div class=${n('content')} ?hidden=${isContentHidden}>
    ${until(codemirrorElement, Textarea({content: defaultContent}))}
  </div>
`;

const Textarea = ({content}) =>
  html`
    <textarea>${content}</textarea>
  `;

class Editor {
  constructor(win, element) {
    this.win = win;

    this.parent_ = element.parentElement;

    const previewElement = element.querySelector(s('.preview'));
    const defaultContent = element.querySelector('textarea').value;

    const {
      promise: codemirrorElement,
      resolve: codemirrorElementResolve,
    } = new Deferred();

    this.state_ = appliedState(() => this.render_(), {
      defaultContent,
      previewElement,
      codemirrorElement,
      isContentHidden: false,
      toggleContent: () => {
        this.state_.isContentHidden = !this.state_.isContentHidden;
      },
    });

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

    this.preview_ = new AmpStoryAdPreview(win, previewElement);

    this.render_();

    codemirrorElement.then(() => {
      delete this.state_.defaultContent; // no longer needed
      this.updatePreview_();
      this.codemirror_.refresh();
      this.codemirror_.on('change', () => this.updatePreview_());
    });
  }

  updatePreview_() {
    this.preview_.update(this.codemirror_.getValue());
  }

  render_() {
    render(renderComponent(this.state_), this.parent_);
  }
}

export {Editor as ctor};
