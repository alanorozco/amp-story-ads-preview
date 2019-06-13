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
import {attachBlobUrl, fileSortCompare} from './file-upload';
import {Deferred} from '../vendor/ampproject/amphtml/src/utils/promise';
import {getNamespace} from '../lib/namespace';
import {html, render} from 'lit-html';
import {repeat} from 'lit-html/directives/repeat';
import {until} from 'lit-html/directives/until';
import {untilAttached} from './utils/until-attached';
import AmpStoryAdPreview from './amp-story-ad-preview';
import codemirror from '../lib/runtime-deps/codemirror';
import fs from 'fs-extra';

const defaultContent = 'src/editor-default.html';

const {id, g, n, s} = getNamespace('editor');

/** @return {Promise<{content: string}>} */
const staticServerData = async () => ({
  content: (await fs.readFile(defaultContent)).toString('utf-8'),
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
 * @return {lit-html/TemplateResult}
 */
const fileRepeatKey = ({url}) => url;

const renderEditor = ({
  codeMirrorElement,
  content = '',
  uploadFiles,
  files = [],
  previewElement,
  isFilesPanelDisplayed = false,
}) => html`
  <div id=${id} class=${n('wrap')}>
    <div class="${'files-panel'}" ?hidden=${!isFilesPanelDisplayed}>
      ${repeat(files, fileRepeatKey, FileListItem)}
    </div>
    <div class=${n('content')}>
      <div class=${n('content-toolbar')}>
        ${FileUploadButton(uploadFiles)}
      </div>
      <!--
        Default Content to load on the server and then populate codemirror on
        the client.
        codeMirrorElement is a promise resolved by codemirror(), hence the
        the until directive. Once resolved, content can be empty.
      -->
      ${until(codeMirrorElement || Textarea({content}))}
    </div>
    <div class="${g('flex-center')} ${n('preview-wrap')}">
      <!-- Empty preview for SSR and inserted as data on the client. -->
      ${previewElement || EmptyPreview()}
    </div>
  </div>
`;

const FileListItem = ({name}) =>
  html`
    <div class="${n('fileList-item')}">
      ${name}
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
 * @param {string=} data.content
 * @return {lit-html/TemplateResult}
 */
const Textarea = ({content}) => html`
  <textarea>${content}</textarea>
`;
const cascadeInputClick = {
  handleEvent(e) {
    const input = e.target.parentElement.querySelector('input');
    input.click();
  },
};

const FileUploadButton = uploadFiles => html`
  <div class="${n('upload-button-container')}">
    <div class="${n('upload-button')}" @click="${cascadeInputClick}">
      Add files
    </div>
    <input type="file" style=" opacity: 0" multiple @change="${uploadFiles}" />
  </div>
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

    const uploadFiles_ = e => this.uploadFiles_(e);
    this.state_ = appliedState(batchedRender, {
      previewElement,
      codeMirrorElement,
      files: [],
      uploadFiles: {
        handleEvent(event) {
          uploadFiles_(event);
        },
      },
    });

    batchedRender();

    this.refreshCodeMirror_();
    this.updatePreview_();
    this.codeMirror_.on('change', () => this.updatePreview_());
  }

  uploadFiles_({currentTarget: {files}}) {
    this.state_.isFilesPanelDisplayed = true;

    this.state_.files = this.state_.files.concat(
      Array.from(files)
        .map(f => attachBlobUrl(this.win, f))
        .sort(fileSortCompare)
    );
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
}

// Standard executable-renderable bundle interface, see lib/bundle.js
export {
  id,
  Editor as ctor,
  renderEditor as renderComponent,
  staticServerData as data,
};
