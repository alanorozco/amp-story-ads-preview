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
import {htmlMinifyConfig} from '../lib/html-minify-config';
import {until} from 'lit-html/directives/until';
import {untilAttached} from './utils/until-attached';
import {
  validViewportId,
  Viewport,
  viewportIdDefault,
  viewportIdFull,
  ViewportSelector,
} from './viewport';
import {wrapEventHandler} from './utils/wrap-event-handler';
import AmpStoryAdPreview from './amp-story-ad-preview';
import codemirror from '../lib/runtime-deps/codemirror';
import fs from 'fs-extra';
import htmlMinifier from 'html-minifier';

const {id, g, n, s} = getNamespace('editor');

const readFixtureHtml = async name =>
  (await fs.readFile(`src/fixtures/${name}.html`)).toString('utf-8');

/** @return {Promise<{content: string}>} */
const staticServerData = async () => ({
  content: await readFixtureHtml('ad'),
  // Since this is a template that is never user-edited, let's minify it to
  // keep the bundle small.
  storyDocTemplate: htmlMinifier.minify(
    await readFixtureHtml('story'),
    htmlMinifyConfig
  ),
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
 * @param {boolean=} data.isFullPreview = false
 * @param {Element=} data.previewElement
 *    Preview element to include inside the viewport.
 *    Defaults to an `EmptyPreview({storyDocTemplate})` element, for
 *    server-side rendering.
 *    (The SSR'd element is taken on runtime to manipulate independently, we
 *    bookkeep it so that it won't be overriden by the client-side rerender.)
 * @param {EventHandler=} data.selectViewport
 * @param {string=} data.storyDocTemplate
 * @param {EventHandler=} data.toggleFullPreview
 * @param {string=} data.viewportId = viewportIdDefault
 *    Viewport id as defined by the `viewports` object in `./viewport.js`.
 *    Defaults to exported `./viewport.viewportIdDefault`.
 * @return {lit-html/TemplateResult}
 */
const renderEditor = ({
  // Keep alphabetically sorted.
  // Or don't. I'm a sign, not a cop. https://git.io/fj2tc
  codeMirrorElement,
  content = '',
  isFullPreview = false,
  previewElement,
  selectViewport,
  storyDocTemplate = '',
  toggleFullPreview,
  viewportId = viewportIdDefault,
}) => html`
  <div id=${id} class=${n('wrap')}>
    <div class=${n('content')} ?hidden=${isFullPreview}>
      <!--
        Default Content to load on the server and then populate codemirror on
        the client.
        codeMirrorElement is a promise resolved by codemirror(), hence the
        the until directive. Once resolved, content can be empty.
      -->
      ${until(codeMirrorElement || Textarea({content}))}
    </div>
    <div class="${g('flex-center')} ${n('preview-wrap')}">
      <!-- Toolbar for full preview toggle and viewport selector. -->
      ${PreviewToolbar({
        isFullPreview,
        toggleFullPreview,
        selectViewport,
        viewportId,
      })}
      ${Viewport({
        viewportId,
        // Empty preview for SSR and inserted as data on the client.
        previewElement: previewElement || EmptyPreview({storyDocTemplate}),
      })}
    </div>
  </div>
`;

/**
 * Renders toolbar for toggle and viewport selector.
 * @param {Object} data
 * @param {boolean=} data.isFullPreview
 * @param {EventHandler=} data.selectViewport
 * @param {EventHandler=} data.toggleFullPreview
 * @param {string=} data.viewportId
 * @return {lit-html/TemplateResult}
 */
const PreviewToolbar = ({
  isFullPreview,
  selectViewport,
  toggleFullPreview,
  viewportId,
}) => html`
  <div class="${g('flex-center')} ${n('preview-toolbar')}">
    ${FullPreviewToggleButton({toggleFullPreview, isFullPreview})}
    ${ViewportSelector({selectViewport, viewportId})}
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
  <div
    class="${g('flex-center')} ${n('content-toggle')}"
    @click=${toggleFullPreview}
  >
    <div>${isFullPreview ? '>' : '<'}</div>
  </div>
`;

/**
 * Renders preview element.
 * This is then managed independently by AmpStoryAdPreview after hydration.
 * @param {Object} data
 * @param {string} data.storyDocTemplate
 * @return {lit-html/TemplateResult}
 */
const EmptyPreview = ({storyDocTemplate}) => html`
  <div class=${n('preview')} data-template=${storyDocTemplate}></div>
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

class Editor {
  constructor(win, element) {
    const {value} = element.querySelector('textarea');
    const previewElement = element.querySelector(s('.preview'));

    this.win = win;

    this.parent_ = element.parentElement;

    const {
      promise: codeMirrorElement,
      resolve: codeMirrorElementResolve,
    } = new Deferred();

    this.codeMirror_ = new codemirror(codeMirrorElementResolve, {
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
      // No need to bookkeep `content` since we've populated codemirror with it.
      codeMirrorElement,
      previewElement,
      isFullPreview: false,
      toggleFullPreview: wrapEventHandler(() => this.toggleFullPreview_()),
      selectViewport: wrapEventHandler(({target: {value}}) =>
        this.viewportChange_(value)
      ),
    });

    batchedRender();

    this.refreshCodeMirror_();
    this.updatePreview_();
    this.codeMirror_.on('change', () => this.updatePreview_());
  }

  viewportChange_(value) {
    if (validViewportId(value) == 'full') {
      this.toggleFullPreview_();
    }
    this.state_.viewportId = validViewportId(value);
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

  updatePreview_() {
    this.preview_.update(this.codeMirror_.getValue());
  }

  toggleFullPreview_() {
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
}

// Standard executable-renderable bundle interface, see lib/bundle.js
export {
  id,
  Editor as ctor,
  renderEditor as renderComponent,
  staticServerData as data,
};
