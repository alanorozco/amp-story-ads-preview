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
import {appliedState, batchedApplier} from './utils/applied-state';
import {Deferred} from '../vendor/ampproject/amphtml/src/utils/promise';
import {getNamespace} from '../lib/namespace';
import {html, render} from 'lit-html';
import {until} from 'lit-html/directives/until';
import {untilAttached} from './utils/until-attached';
import AmpStoryAdPreview from './amp-story-ad-preview';
import codemirror from '../lib/runtime-deps/codemirror';
import fs from 'fs-extra';

const defaultContentPath = 'src/editor-default.html';

const {id, n, s} = getNamespace('editor');

export {id};

export const data = async () => ({
  isContentHidden: false,
  defaultContent: (await fs.readFile(defaultContentPath)).toString('utf-8'),
});

export const renderComponent = ({
  defaultContent,
  isContentHidden,
  toggleContent = null,
  previewElement = null,
  codemirrorElement = null,
}) => html`
  <div id=${id} class=${n('wrap')}>
    <div class=${n('content')} ?hidden=${isContentHidden}>
      ${until(codemirrorElement || DefaultContent({defaultContent}))}
    </div>
    <div class=${n('content-toggle')} @click=${toggleContent}>
      <div>${isContentHidden ? '>' : '<'}</div>
    </div>
    ${previewElement || Preview()}
  </div>
`;

const DefaultContent = ({defaultContent}) => html`
  <textarea class=${n('default-content')}>${defaultContent}</textarea>
`;

const Preview = () => html`
  <div class=${n('preview')}></div>
`;

class Editor {
  constructor(win, element) {
    this.win = win;

    this.parent_ = element.parentElement;

    const {value} = element.querySelector(s('.default-content'));
    const previewElement = element.querySelector(s('.preview'));

    const {
      promise: codemirrorElement,
      resolve: codemirrorElementResolve,
    } = new Deferred();

    this.codemirror_ = new codemirror(codemirrorElementResolve, {
      value,
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

    this.batchedRender_ = batchedApplier(win, state => this.render_(state));

    this.state_ = appliedState(this.batchedRender_, {
      previewElement,
      codemirrorElement,
      isContentHidden: false,
      toggleContent: () => {
        this.state_.isContentHidden = !this.state_.isContentHidden;
      },
    });

    this.hydrate_();
  }

  render_(state) {
    render(renderComponent(state), this.parent_);
  }

  async hydrate_() {
    this.batchedRender_(this.state_);
    this.updatePreview_();

    // Render is async, so we need to wait for the codemirror element to be
    // attached in order to refresh and attach events.
    await untilAttached(this.parent_, this.state_.codemirrorElement);

    this.codemirror_.refresh();
    this.codemirror_.on('change', () => this.updatePreview_());
  }

  updatePreview_() {
    this.preview_.update(this.codemirror_.getValue());
  }
}

export {Editor as ctor};
