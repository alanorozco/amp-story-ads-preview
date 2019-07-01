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
import {appliedState, batchedApplier} from './utils/applied-state';
import {assert} from '../lib/assert';
import {attachBlobUrl, fileSortCompare} from './file-upload';
import {Deferred} from '../vendor/ampproject/amphtml/src/utils/promise';
import {getNamespace} from '../lib/namespace';
import {html, render} from 'lit-html';
import {htmlMinifyConfig} from '../lib/html-minify-config';
import {redispatchAs} from './utils/events';
import {repeat} from 'lit-html/directives/repeat';
import {ToggleButton} from './toggle-button';
import {until} from 'lit-html/directives/until';
import {untilAttached} from './utils/until-attached';
import {
  validViewportId,
  Viewport,
  viewportIdDefault,
  viewportIdFull,
  ViewportSelector,
} from './viewport';
import AmpStoryAdPreview from './amp-story-ad-preview';
import codemirror from '../lib/runtime-deps/codemirror';
import fs from 'fs-extra';
import htmlMinifier from 'html-minifier';

const {id, g, n, s} = getNamespace('editor');

/**
 * Holds CodeMirror HTML autocompletion specs for AMP formats.
 * This is taken from amp.dev and is built from the AMP spec... somehow.
 */
const hintsUrl = '/static/hints/amphtml-hint.json';

/**
 * Hints ignored on typing when delimited by these chars.
 * Stolen from @ampproject/docs/playground/src/editor/editor.js
 */
const hintIgnoreEnds = new Set([
  ';',
  ',',
  ')',
  '`',
  '"',
  "'",
  '>',
  '{',
  '}',
  '[',
  ']',
]);

/**
 * tagName-to-attributes for uploaded file autocomplete hints.
 * (These only apply to the amp4ads validation set.)
 *
 * TODO(alanorozco): build this set dynamically
 * TODO(alanorozco): set hints for tag context based on file extension
 */
const attrFileHintTagAttrs = {
  'amp-img': ['src'],
  'amp-anim': ['src'],
  'amp-video': ['src', 'poster'],
  'amp-audio': ['src'],
  'source': ['src'],
  'track': ['src'],
};

const attrFileHintTagNames = Object.keys(attrFileHintTagAttrs);

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
 * @param {boolean=} data.isFilesPanelDisplayed = false
 * @param {boolean=} data.isFullPreview = false
 * @param {Element=} data.previewElement
 *    Preview element to include inside the viewport.
 *    Defaults to an `EmptyPreview({storyDocTemplate})` element, for
 *    server-side rendering.
 *    (The SSR'd element is taken on runtime to manipulate independently, we
 *    bookkeep it so that it won't be overriden by the client-side rerender.)
 * @param {string=} data.storyDocTemplate
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
  files = [],
  isFullPreview = false,
  isFilesPanelDisplayed = false,
  previewElement,
  storyDocTemplate = '',
  viewportId = viewportIdDefault,
}) => html`
  <div id=${id} class=${n('wrap')}>
    ${FilesPanel({
      files,
      isDisplayed: !isFullPreview && isFilesPanelDisplayed,
    })}
    ${ContentPanel({
      isDisplayed: !isFullPreview,
      isFilesPanelDisplayed,
      codeMirrorElement,
      content,
    })}
    ${PreviewPanel({
      isFullPreview,
      previewElement,
      storyDocTemplate,
      viewportId,
    })}
  </div>
`;

/**
 * @param {Object} data
 * @param {boolean} isDisplayed
 * @param {Array<{name: string}>} data.files
 * @return {lit-html/TemplateResult}
 */
const FilesPanel = ({isDisplayed, files}) => html`
  <div class="${n('files-panel')}" ?hidden=${!isDisplayed}>
    <div
      class="${[g('flex-center'), n('toolbar'), n('files-panel-header')].join(
        ' '
      )}"
    >
      Files
    </div>
    ${FileList({files})}
  </div>
`;

const fileRepeatKey = ({url}) => url;

/**
 * When `data.files` is empty, renders a "No files" message.
 * Otherwise renders the file list.
 * @param {Object} data
 * @param {Array<{name: string}>} data.files
 * @return {lit-html/TemplateResult}
 */
const FileList = ({files}) =>
  files.length < 1
    ? html`
        <div class="${g('flex-center')} ${n('file-list-empty')}">
          <div>No files uploaded.</div>
          ${FileUploadButton()}
        </div>
      `
    : html`
        <div class="${n('file-list')}">
          ${repeat(files, fileRepeatKey, FileListItem)}
        </div>
      `;

const dispatchInsertFileRef = redispatchAs(g('insert-file-ref'));
const dispatchDeleteFile = redispatchAs(g('delete-file'));

/**
 * @param {{name: string}} file
 * @param {{name: string}} file
 * @param {number} index
 * @return {lit-html/TemplateResult}
 */
const FileListItem = ({name}, index) => html`
  <div
    class="${n('file-list-item')}"
    data-name="${name}"
    data-index="${index}"
    @click="${dispatchInsertFileRef}"
  >
    <div class=${n('delete-file-button')} @click=${dispatchDeleteFile}>
      <span>×</span>
    </div>
    <div class="${n('file-list-item-clipped')}">
      ${name}
    </div>
    <div class="${n('file-list-item-unclipped')}">
      ${name}
    </div>
  </div>
`;

/**
 * Cascades a click from a parent so it programatically clicks an <input> inside
 * of it, to propagate a click into a hidden `input[type=file]` element.
 * @param {Event} e
 */
function cascasdeInputClick({currentTarget}) {
  assert(currentTarget.querySelector('input')).click();
}

const dispatchUploadFiles = redispatchAs(g('upload-files'));

/**
 * Renders a button to "upload" files--that is, set Blob URLs so they're
 * accessible from the AMP Ad document.
 */
const FileUploadButton = () => html`
  <div class="${n('upload-button-container')}" @click="${cascasdeInputClick}">
    <div class="${n('upload-button')}">
      Add files
    </div>
    <input type="file" hidden multiple @change="${dispatchUploadFiles}" />
  </div>
`;

/**
 * @param {Object} data
 * @param {Promise<Element>=} data.codeMirrorElement
 * @param {string=} data.content
 * @param {boolean} data.isDisplayed
 * @param {boolean} data.isFilesPanelDisplayed
 * @return {lit-html/TemplateResult}
 */
const ContentPanel = ({
  codeMirrorElement,
  content,
  isDisplayed,
  isFilesPanelDisplayed,
}) => html`
  <div class=${n('content')} ?hidden=${!isDisplayed}>
    ${ContentToolbar({isFilesPanelDisplayed})}
    <!--
        Default Content to load on the server and then populate codemirror on
        the client.
        codeMirrorElement is a promise resolved by codemirror(), hence the
        until directive. Once resolved, content can be empty.
      -->
    ${until(codeMirrorElement || Textarea({content}))}
  </div>
`;

/**
 * Renders content panel toolbar.
 * @param {Object} data
 * @param {boolean=} data.isFilesPanelDisplayed
 * @return {lit-html/TemplateResult}
 */
const ContentToolbar = ({isFilesPanelDisplayed}) => html`
  <div
    class="${[g('flex-center'), n('content-toolbar'), n('toolbar')].join(' ')}"
  >
    ${ToggleButton({
      isOpen: isFilesPanelDisplayed,
      name: 'files-panel',
    })}
    ${FileUploadButton()}
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
 * @param {Object} data
 * @param {boolean} data.isFullPreview
 * @param {string} data.viewportId
 * @param {Element=} data.previewElement
 * @param {string=} data.storyDocTemplate
 * @return {lit-html/TemplateResult}
 */
const PreviewPanel = ({
  isFullPreview,
  viewportId,
  previewElement,
  storyDocTemplate,
}) => html`
  <div class="${g('flex-center')} ${n('preview-wrap')}">
    <!-- Toolbar for full preview toggle and viewport selector. -->
    ${PreviewToolbar({
      isFullPreview,
      viewportId,
    })}
    ${Viewport({
      viewportId,
      // Empty preview for SSR and inserted as data on the client.
      previewElement: previewElement || EmptyPreview({storyDocTemplate}),
    })}
  </div>
`;

/**
 * Renders preview panel toolbar.
 * @param {Object} data
 * @param {boolean=} data.isFullPreview
 * @param {string=} data.viewportId
 * @return {lit-html/TemplateResult}
 */
const PreviewToolbar = ({isFullPreview, viewportId}) => html`
  <div class="${`${g('flex-center')} ${n('preview-toolbar')} ${n('toolbar')}`}">
    ${ToggleButton({
      isOpen: !isFullPreview,
      name: 'full-preview',
    })}
    ${ViewportSelector({
      className: [g('flex-center')],
      viewportId,
    })}
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

class Editor {
  constructor(win, element) {
    const {value} = element.querySelector('textarea');
    const previewElement = element.querySelector(s('.preview'));

    this.win = win;

    this.parent_ = element.parentElement;

    this.hintTimeout_ = null;
    this.amphtmlHints_ = this.fetchHintsData_();

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
      files: [],
      isFullPreview: false,
      previewElement,
      viewportId: viewportIdDefault,
    });

    batchedRender();

    this.refreshCodeMirror_();
    this.attachCodeMirrorEvents_();

    // We only run amp4ads in this REPL.
    this.setHints_('amp4ads');

    this.updatePreview_();

    this.attachEventHandlers_();
  }

  attachEventHandlers_() {
    const topLevelHandlers = {
      [g('delete-file')]: this.deleteFile_,
      [g('insert-file-ref')]: this.insertFileRef_,
      [g('upload-files')]: this.uploadFiles_,
      [g('select-viewport')]: this.selectViewport_,
      [g('toggle')]: this.toggle_,
    };

    for (const eventType of Object.keys(topLevelHandlers)) {
      const boundHandler = topLevelHandlers[eventType].bind(this);
      this.parent_.addEventListener(eventType, boundHandler);
    }
  }

  attachCodeMirrorEvents_() {
    this.codeMirror_.on('change', () => this.updatePreview_());

    // Below stolen from @ampproject/docs/playground/src/editor/editor.js
    // (Editor#createCodeMirror)
    this.codeMirror_.on('inputRead', (editor, change) => {
      if (this.hintTimeout_) {
        clearTimeout(this.hintTimeout_);
      }
      if (change.origin !== '+input') {
        return;
      }
      if (change && change.text && hintIgnoreEnds.has(change.text.join(''))) {
        return;
      }
      this.hintTimeout_ = setTimeout(() => {
        if (editor.state.completionActive) {
          return;
        }
        const cur = editor.getCursor();
        const token = editor.getTokenAt(cur);
        const isCss = token.state.htmlState.context.tagName === 'style';
        const isTagDeclaration = token.state.htmlState.tagName;
        const isTagStart = token.string === '<';
        if (isCss || isTagDeclaration || isTagStart) {
          codemirror.commands.autocomplete(editor);
        }
      }, 150);
    });
  }

  /**
   * Toggles something on ToggleButton click.
   * (Figures out what to toggle from `data-name` attribute.)
   * @param {Event} e
   * @private
   */
  toggle_({target: {dataset}}) {
    const name = assert(dataset.name);
    if (name == 'full-preview') {
      return this.toggleFullPreview_();
    }
    if (name == 'files-panel') {
      return this.toggleFilesPanel_();
    }
    assert(false, `I don't know how to toggle "${name}".`);
  }

  uploadFiles_({target: {files}}) {
    this.state_.isFilesPanelDisplayed = true;

    this.state_.files = this.state_.files.concat(
      Array.from(files)
        .map(f => attachBlobUrl(this.win, f))
        .sort(fileSortCompare)
    );

    this.updateFileHints_();
  }

  selectViewport_({target}) {
    const {value} = target;

    // If viewport is changed to 'full', the view will display an error message
    // instead of the preview.
    // TODO: Make 'full' special and add custom sizing
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
    const doc = this.codeMirror_.getValue();
    const docWithFileRefs = this.replaceFileRefs_(doc);
    this.preview_.update(docWithFileRefs);
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

  toggleFilesPanel_() {
    this.state_.isFilesPanelDisplayed = !this.state_.isFilesPanelDisplayed;
  }

  insertFileRef_({target: {dataset}}) {
    const name = assert(dataset.name);
    this.codeMirror_.replaceSelection(`/${name}`, 'around');
  }

  replaceFileRefs_(str) {
    for (const {name, url} of this.state_.files) {
      str = str.replace(new RegExp(`/${name}`, 'g'), url);
    }
    return str;
  }

  deleteFile_({target}) {
    const {dataset} = assert(target.closest('[data-index]'));
    const deletedIndex = parseInt(assert(dataset.index), 10);
    const [deleted] = this.state_.files.splice(deletedIndex, 1);
    const {url: deletedUrl} = deleted;

    // not all urls are blob urls
    if (/^blob:/.test(deletedUrl)) {
      this.win.URL.revokeObjectURL(deletedUrl);
    }

    // Force re-render
    this.state_.files = this.state_.files;
    this.updateFileHints_();
  }
  /**
   * Replaces CodeMirror hints with the AMP spec.
   *
   * Kinda stolen from @ampproject/docs/playground/src/editor.js
   * (Editor#loadHints).
   *
   * Additionally sets uploaded file name hints for attrs like "src".
   *
   * @param {string} format
   *    Should always be "amp4ads" for our use case, see top-level keys of
   *    amphtml-hint.json for possible values.
   * @private
   */
  async setHints_(format) {
    const {htmlSchema} = codemirror;
    const hints = await this.amphtmlHints_;
    for (const key of Object.keys(htmlSchema)) {
      delete htmlSchema[key];
    }
    Object.assign(htmlSchema, hints[format.toLowerCase()]);

    // Below, ours, in case of race:
    this.updateFileHints_();
  }

  /**
   * Loads a JSON file containing the CodeMirror HTML Schema to be consumed for
   * AMP formats.
   *
   * Kinda stolen from @ampproject/docs/playground/src/editor.js
   * (Editor#fetchHintsData).
   * @private
   */
  fetchHintsData_() {
    const {promise, reject, resolve} = new Deferred();
    this.win.requestIdleCallback(async () => {
      try {
        const response = await this.win.fetch(hintsUrl);
        assert(response.status === 200, `fetch got ${response.status}`);
        resolve(response.json());
      } catch (err) {
        reject(err);
      }
    });
    return promise;
  }

  /**
   * Sets attr hints like for "src" and "poster" for the tags in the spec that
   * allow it, so that they show uploaded files.
   * @private
   */
  updateFileHints_() {
    const {files} = this.state_;
    const {htmlSchema} = codemirror;

    // CodeMirror HTML spec allows null for attributes without known values.
    const readableUrlsValueSet =
      files.length > 0 ? files.map(({name}) => `/${name}`) : null;

    for (const tagName of attrFileHintTagNames) {
      if (!(tagName in htmlSchema)) {
        // spec not populated yet, will exec again when fetched.
        return;
      }
      for (const attr of attrFileHintTagAttrs[tagName]) {
        htmlSchema[tagName].attrs[attr] = readableUrlsValueSet;
      }
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
