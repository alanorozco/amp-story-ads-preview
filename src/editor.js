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
import {
  Viewport,
  viewportIdDefault,
  viewportIdFull,
  ViewportSelector,
} from './viewport';
import AmpStoryAdPreview from './amp-story-ad-preview';
import codemirror from '../lib/runtime-deps/codemirror';
import fs from 'fs-extra';

const defaultContentPath = 'src/editor-default.html';

const {id, n, s} = getNamespace('editor');

/** @return {Promise<{defaultContent: string}>} Data for static server build. */
export const data = async () => ({
  defaultContent: (await fs.readFile(defaultContentPath)).toString('utf-8'),
});

/**
 * Renders Live Editor.
 * @param {Object} data
 *    All properties optional, see each one for defaults and exclusion effects.
 * @param {Promise<Element>=} data.codemirrorElement
 *    Promise to include editor content element once rendered by codemirror.
 *    Defaults to `DefaultContent({defaultContent})` for server-side rendering,
 *    which is a single-use element to populate codemirror.
 * @param {string=} data.defaultContent = ''
 *    Passed on for server-side rendering.
 *    Omitting this before populating will simply result in codemirror not
 *    having any content.
 *    If already populated, omitting this has no effect for codemirror.
 * @param {boolean=} data.isFullPreview = false
 * @param {Element=} data.previewElement
 *    Preview element to include inside the viewport.
 *    Defaults to an empty `Preview()` element, for server-side rendering.
 *    (The server side-rendered element is taken on runtime to manipulate
 *    independently, its bookkeeping prevents overriding it on hydration.)
 * @param {EventHandler=} data.selectViewport
 * @param {EventHandler=} data.toggleFullPreview
 * @param {string=} data.viewportId = viewportIdDefault
 *    Viewport id as defined by the `viewports` object in `./viewport.js`.
 *    Defaults to exported `./viewport.viewportIdDefault`.
 * @return {lit-html/TemplateResult}
 */
export const renderEditor = ({
  isFullPreview = false,
  codemirrorElement,
  defaultContent = '',
  previewElement,
  selectViewport,
  toggleFullPreview,
  viewportId = viewportIdDefault,
}) => html`
  <div id=${id} class=${n('wrap')}>
    <div class=${n('content')} ?hidden=${isFullPreview}>
      <!--
        Default Content to load on the server and then populate codemirror on
        the client.
        codemirrorElement is a promise resolved by codemirror(), hence the
        call to the until directive. Once resolved, defaultContent can be empty
        since already populated.
      -->
      ${until(codemirrorElement || DefaultContent({defaultContent}))}
    </div>
    <div class="-flex-center ${n('preview-wrap')}">
      ${PreviewToolbar({
        toggleFullPreview,
        isFullPreview,
        selectViewport,
        viewportId,
      })}
      ${Viewport({
        viewportId,
        // Empty preview for SSR and inserted as data on the client.
        previewElement: previewElement || EmptyPreview(),
      })}
    </div>
  </div>
`;

/**
 * Renders default editor content to hydrate on runtime.
 * @param {Object} data
 * @param {boolean} data.isFullPreview
 * @param {string} data.viewportId
 * @param {EventHandler=} data.selectViewport - (optional)
 * @param {EventHandler=} data.toggleFullPreview - (optional)
 * @return {lit-html/TemplateResult}
 */
const PreviewToolbar = ({
  isFullPreview,
  viewportId,
  selectViewport = null,
  toggleFullPreview = null,
}) => html`
  <div class="-flex-center ${n('preview-toolbar')}">
    ${FullPreviewToggleButton({toggleFullPreview, isFullPreview})}
    ${ViewportSelector({selectViewport, viewportId})}
  </div>
`;

/**
 *
 * @param {Object} data
 * @param {boolean} data.isFullPreview
 * @param {EventHandler=} data.toggleFullPreview - (optional)
 * @return {lit-html/TemplateResult}
 */
const FullPreviewToggleButton = ({isFullPreview, toggleFullPreview}) => html`
  <div class="-flex-center ${n('content-toggle')}" @click=${toggleFullPreview}>
    <div>${isFullPreview ? '>' : '<'}</div>
  </div>
`;

/**
 * Renders preview element.
 * This is then managed independently by AmpStoryAdPreview after hydration.
 * @return {lit-html/TemplateResult}
 */
const EmptyPreview = () => html`
  <div class=${n('preview')}></div>
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

class Editor {
  constructor(win, element) {
    this.win = win;
    this.parent_ = element.parentElement;

    const previewElement = element.querySelector(s('.preview'));
    const {value} = element.querySelector(s('.default-content'));

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

    const batchedRender = batchedApplier(win, () => this.render_());

    this.state_ = appliedState(batchedRender, {
      // No need to bookkeep `defaultContent` since it's only needed for
      // populating codemirror.
      previewElement,
      codemirrorElement,
      viewportId: viewportIdDefault,
      isFullPreview: false,
      toggleFullPreview: this.wrapEventHandler_(this.toggleFullPreview_),
      selectViewport: this.wrapEventHandler_(this.selectViewport_),
    });

    batchedRender(this.state_);

    this.updatePreview_();
    this.refreshCodeMirror_();

    this.codemirror_.on('change', () => this.updatePreview_());
  }

  render_() {
    render(renderEditor(this.state_), this.parent_, {eventContext: this});
  }

  /** @private */
  async refreshCodeMirror_() {
    // Render is async, so we need to wait for the codemirror element to be
    // attached in order to refresh and attach events.
    await untilAttached(this.parent_, this.state_.codemirrorElement);
    this.codemirror_.refresh();
  }

  /**
   * @param {function(Event)} handler
   * @param {Object=} opts - (optional)
   * @param {boolean=} opts.capture - (optional)
   * @param {boolean=} opts.passive - (optional)
   * @param {boolean=} opts.once - (optional)
   * @return {!EventHandler}
   *    EventHandler that executes `handler` bound to this class's context
   *    according to `opts`.
   * @private
   */
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
    this.preview_.update(this.codemirror_.getValue());
  }

  /**
   * @param {Event} unused
   * @private
   */
  toggleFullPreview_(unused) {
    this.state_.isFullPreview = !this.state_.isFullPreview;

    // Set full viewport and keep previous for restoring later.
    if (this.state_.isFullPreview) {
      this.state_.viewportIdBeforeFullPreview = this.state_.viewportId;
      this.state_.viewportId = viewportIdFull;
      return;
    }

    // Restore viewport as it was before toggling.
    if (this.state_.viewportIdBeforeFullPreview) {
      const {viewportIdBeforeFullPreview} = this.state_;
      delete this.state_.viewportIdBeforeFullPreview;
      this.state_.viewportId = viewportIdBeforeFullPreview;
    }
  }

  /**
   * @param {InputEvent} e
   * @param {EventTarget} e.target
   * @private
   */
  selectViewport_({target}) {
    const {value} = /** @type {HTMLSelectElement} */ (target);
    this.selectViewportById_(value);
  }

  /**
   * @param {string} viewportId
   *    Viewport id as defined in ./viewports.viewports.
   * @private
   */
  selectViewportById_(viewportId) {
    if (this.state_.viewportId == viewportId) {
      return;
    }
    delete this.state_.viewportIdBeforeFullPreview;
    this.state_.viewportId = viewportId;
  }
}

// Standard executable-renderable bundle interface, see lib/bundle.js
export {id, Editor as ctor, renderEditor as renderComponent};
