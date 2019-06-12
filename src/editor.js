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

const renderEditor = ({
  codeMirrorElement,
  content = '',
  handleFiles,
  files = [],
  previewElement,
  isFilesPanelDisplayed = false,
}) => html`
  <div id=${id} class=${n('wrap')}>
    <div
      style="flex: 0 0 110px; border-right: 3px solid #5998a6"
      ?hidden=${!isFilesPanelDisplayed}
    >
      ${files.map(fileList_item)}
    </div>
    <div class=${n('content')}>
      <div class=${n('content-toolbar')}>
        ${UploadFile(handleFiles)}
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
const fileList_item = ({file_name}) =>
  html`
    <div style="padding-top: 15px; padding-bottom:15px; text-align:center;">
      ${file_name}
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
const casscadeInputClick = {
  handleEvent(e) {
    const input = e.target.parentElement.querySelector('input');
    input.click();
  },
};
function UploadFile(handleFiles = null) {
  const FileInput = html`
    <div style="margin: 10px 20px">
      <div style="position: absolute" @click="${casscadeInputClick}">
        Add files
      </div>
      <input
        type="file"
        style=" opacity: 0"
        multiple
        @change="${handleFiles}"
      />
    </div>
  `;
  return FileInput;
}

class Editor {
  constructor(win, element) {
    const {value} = element.querySelector('textarea');
    const previewElement = element.querySelector(s('.preview'));

    this.win = win;

    this.parent_ = element.parentElement;
    const files = [];

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

    const handleFiles = e => this.handleFiles(e);
    this.state_ = appliedState(batchedRender, {
      previewElement,
      codeMirrorElement,
      files,
      handleFiles: {
        handleEvent(event) {
          handleFiles(event);
        },
      },
    });

    batchedRender();

    this.refreshCodeMirror_();
    this.updatePreview_();
    this.codeMirror_.on('change', () => this.updatePreview_());
  }

  handleFiles(event) {
    const URL = this.win.URL || this.win.webkitURL;

    var fileList = event.currentTarget.files;
    for (let i = 0; i < fileList.length; i++) {
      var img_src = URL.createObjectURL(fileList[i]);
      var image = {file_name: fileList[i].name, file_source: img_src};
      this.state_.files = [...this.state_.files, image];
    }

    this.state_.isFilesPanelDisplayed = true;
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
