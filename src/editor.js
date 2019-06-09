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
import {Deferred} from '../vendor/ampproject/amphtml/src/utils/promise';
import {expectAppendMutate} from './expect-append-mutate';
import {getNamespace} from '../lib/namespace';
import {html, render} from 'lit-html';
import {renderState} from './applied-state';
import {until} from 'lit-html/directives/until';
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
  elements: {preview, codemirror},
}) => html`
  <div id=${id} class=${n('wrap')}>
    ${Content({defaultContent, isContentHidden, codemirror})}
    ${ContentToggleButton({toggleContent, isContentHidden})}
    ${until(preview, Preview())}
  </div>
`;

const ContentToggleButton = ({toggleContent, isContentHidden}) => html`
  <div class=${n('content-toggle')} @click=${toggleContent}>
    <div>${isContentHidden ? '>' : '<'}</div>
  </div>
`;

const Content = ({defaultContent, codemirror, isContentHidden}) => html`
  <div class=${n('content')} ?hidden=${isContentHidden}>
    ${until(codemirror, DefaultContent({defaultContent}))}
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

    const defaultContent = element.querySelector(s('.default-content')).value;
    const preview = element.querySelector(s('.preview'));

    const {
      promise: codemirrorElementPromise,
      resolve: codemirrorElementResolve,
    } = new Deferred();

    this.codemirrorElementPromise_ = codemirrorElementPromise;

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

    this.preview_ = new AmpStoryAdPreview(win, preview);

    this.state_ = renderState(win, state => this.render_(state), {
      elements: {
        preview,
        codemirror: codemirrorElementPromise,
      },
      defaultContent,
      isContentHidden: false,
      toggleContent: () => {
        this.state_.isContentHidden = !this.state_.isContentHidden;
      },
    });

    this.updatePreview_();
    this.setupCodeMirror_();
  }

  async setupCodeMirror_() {
    const element = await this.codemirrorElementPromise_;
    delete this.state_.defaultContent; // no longer needed
    await expectAppendMutate(this.parent_, element);
    this.codemirror_.refresh();
    this.codemirror_.on('change', () => this.updatePreview_());
  }

  updatePreview_() {
    this.preview_.update(this.codemirror_.getValue());
  }

  render_(state) {
    render(renderComponent(state), this.parent_);
  }
}

export {Editor as ctor};
