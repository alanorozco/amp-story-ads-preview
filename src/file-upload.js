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
import './file-upload.css';
import {assert} from '../lib/assert';
import {classMap} from 'lit-html/directives/class-map';
import {getNamespace} from '../lib/namespace';
import {html} from 'lit-html';
import {redispatchAs} from './utils/events';
import {repeat} from 'lit-html/directives/repeat';
import {Toolbar} from './toolbar';

const {g, n} = getNamespace('file-upload');

/**
 * @param {{name: string}} a
 * @param {{name: string}} b
 * @return {number}
 */
export const fileSortCompare = ({name: a}, {name: b}) => (a > b ? 1 : -1);

/**
 * @param {Window} win
 * @param {File} file
 * @return {{name: string, url: string}}
 */
export const attachBlobUrl = (win, file) => ({
  name: file.name,
  url: win.URL.createObjectURL(file),
});

export const FilesDragHint = ({isDisplayed}) => html`
  <div
    class=${classMap({
      [g('flex-center')]: true,
      [n('drag-hint')]: true,
      [n('displayed')]: isDisplayed,
    })}
  >
    <span class=${n('drag-hint-arrow')}>⇐</span> Drop to add files
  </div>
`;

/**
 * @param {Object} data
 * @param {boolean} isDisplayed
 * @param {Array<{name: string}>} data.files
 * @return {lit-html/TemplateResult}
 */
export const FilesPanel = ({isDisplayed, files}) => html`
  <div class="${n('panel')}" ?hidden=${!isDisplayed}>
    ${Toolbar({classNames: [n('panel-header')], children: ['Files']})}
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
        <div class="${g('flex-center')} ${n('list-empty')}">
          <div class="${n('text')}">No files uploaded.</div>
          ${FileUploadButton()}
        </div>
      `
    : html`
        <div class="${n('list')}">
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
    class="${n('list-item')}"
    data-name="${name}"
    data-index="${index}"
    @click="${dispatchInsertFileRef}"
  >
    <div class=${n('delete-button')} @click=${dispatchDeleteFile}>
      <span>×</span>
    </div>
    <div class="${n('clipped')}">
      ${name}
    </div>
    <div class="${n('unclipped')}">
      ${name}
    </div>
  </div>
`;

/**
 * Cascades a click from a parent so it programatically clicks an <input> inside
 * of it, to propagate a click into a hidden `input[type=file]` element.
 * @param {Event} e
 */
function cascadeInputClick({currentTarget}) {
  assert(currentTarget.querySelector('input')).click();
}

const dispatchUploadFiles = redispatchAs(g('upload-files'));

/**
 * Renders a button to "upload" files--that is, set Blob URLs so they're
 * accessible from the AMP Ad document.
 */
export const FileUploadButton = () => html`
  <div class="${n('upload-button-container')}" @click="${cascadeInputClick}">
    <div class="${(n('upload-button'), g('text-button'))}">
      Add Files
    </div>
    <input type="file" hidden multiple @change="${dispatchUploadFiles}" />
  </div>
`;

export function removeFileRevokeUrl(win, files, index) {
  const [deleted] = files.splice(index, 1);
  const {url} = deleted;

  // not all urls are blob urls
  if (/^blob:/.test(url)) {
    win.URL.revokeObjectURL(url);
  }

  return files;
}

export function replaceFileRefs(docStr, files) {
  for (const {name, url} of files) {
    docStr = docStr.replace(new RegExp(`/${name}`, 'g'), url);
  }
  return docStr;
}

export const concatAttachBlobUrl = (win, source, files) =>
  source
    .concat(Array.from(files).map(f => attachBlobUrl(win, f)))
    .sort(fileSortCompare);
