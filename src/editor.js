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

const {id, g, n, s} = getNamespace('editor');

/** @return {Promise<{defaultContent: string}>} Data for static server build. */
export const data = async () => ({
  content: (await fs.readFile(defaultContentPath)).toString('utf-8'),
});

/**
 * Renders Live Editor.
 * @param {Object} data
 *    All properties optional, see each one for defaults and exclusion effects.
 * @param {Promise<Element>=} data.codeMirrorElement
 *    Promise to include editor content element once rendered by codemirror.
 *    Defaults to `Textarea({content})` for server-side rendering,
 *    which is a single-use element to populate codemirror.
 * @param {string=} data.content = ''
 *    Passed on for server-side rendering.
 *    Omitting this before populating will simply result in codemirror not
 *    having any content.
 *    If already populated, omitting this has no effect for codemirror.
 * @param {Element=} data.previewElement
 *    Preview element to include inside the viewport.
 *    Defaults to an `EmptyPreview()` element, for server-side rendering.
 *    (The server side-rendered element is taken on runtime to manipulate
 *    independently, its bookkeeping prevents overriding it on hydration.
 * @param {boolean=} data.isFullPreview
 *    Sets hidden attribute for Textarea
 *  @param {EventHandler=} data.toggleFullPreview
 *    Switches isFullPreview from true to false or vice versa
 * @return {lit-html/TemplateResult}
 */
const renderEditor = ({
  codemirrorElement,
  content = '',
  isFullPreview = false,
  toggleFullPreview,
  previewElement,
}) => html`
  <div id=${id} class=${n('wrap')}>
    <div class=${n('content')} ?hidden=${isFullPreview}>
      ${until(codemirrorElement || Textarea({content}))}
    </div>
    <div class="${g('flex-center')} ${n('preview-wrap')}">
      ${PreviewToolbar({
        isFullPreview,
        toggleFullPreview,
      })}
      ${previewElement || EmptyPreview()}
    </div>
  </div>
`;

/**
 * Renders toolbar for toggle and viewport selector.
 * @param {Object} data
 * @param {boolean=} data.isFullPreview
 * @param {EventHandler=} data.toggleFullPreview
 * @return {lit-html/TemplateResult}
 */
const PreviewToolbar = ({isFullPreview, toggleFullPreview = null}) => html`
    <div class="-flex-center ${n('preview-toolbar')}">
      ${FullPreviewToggleButton({toggleFullPreview, isFullPreview})}
    </div>
  </div>
`;

/**
 * Renders full preview toggle button.
 * @param {Object} data
 * @param {boolean=} data.isFullPreview
 * @param {EventHandler=} data.toggleFullPreview
 * @return {lit-html/TemplateResult}
 */
const FullPreviewToggleButton = ({isFullPreview, toggleFullPreview}) => html`
  <div class="-flex-center ${n('content-toggle')}" @click=${toggleFullPreview}>
    <div>${isFullPreview ? '>' : '<'}</div>
  </div>
`;

/**
 * Renders default editor content to hydrate on runtime.
 * @param {Object} data
 * @param {string=} data.content
 * @return {lit-html/TemplateResult}
 */
const Textarea = ({content}) => html`
  <textarea>${content}</textarea>
`;

/**
 * Renders preview element.
 * This is then managed independently by AmpStoryAdPreview after hydration.
 * @return {lit-html/TemplateResult}
 */
const EmptyPreview = () => html`
  <div class="${n('preview')}"></div>
`;

class Editor {
  constructor(win, element) {
    this.win = win;
    this.parent_ = element.parentElement;

    const previewElement = element.querySelector(s('.preview'));
    const {value} = element.querySelector('textarea');

    const {
      promise: codemirrorElement,
      resolve: codemirrorElementResolve,
    } = new Deferred();

    this.codeMirror_ = new codemirror(codemirrorElementResolve, {
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

    const batchedRender = batchedApplier(win, () => this.render_());

    this.state_ = appliedState(batchedRender, {
      // No need to bookkeep `defaultContent` since it's only needed for
      // populating codemirror.
      codemirrorElement,
      previewElement,
      isFullPreview: false,
      toggleFullPreview: this.wrapEventHandler_(this.toggleFullPreview_),
    });

    batchedRender(this.state_);

    this.refreshCodeMirror_();
    this.updatePreview_();
    this.codeMirror_.on('change', () => this.updatePreview_());
  }

  render_() {
    render(renderEditor(this.state_), this.parent_, {eventContext: this});
  }

  /** @private */
  async refreshCodeMirror_() {
    // Render is async: we wait for the element to be attached to refresh.
    await untilAttached(this.parent_, this.state_.codeMirrorElement);
    this.codeMirror_.refresh();
  }

  wrapEventHandler_(handler, opts = {}) {
    const bound = handler.bind(this);
    return {
      ...opts,
      handleEvent(e) {
        return bound(e);
      },
    };
  }

  updatePreview_() {
    this.preview_.update(this.codeMirror_.getValue());
  }

  toggleFullPreview_(unused) {
    this.state_.isFullPreview = !this.state_.isFullPreview;
  }
}

export {id, Editor as ctor, renderEditor as renderComponent};
