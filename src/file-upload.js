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
import {Deferred} from '../vendor/ampproject/amphtml/src/utils/promise';
import {getNamespace} from '../lib/namespace';
import {html} from 'lit-html';
import {memoize} from 'lodash-es';
import {redispatchAs} from './utils/events';
import {repeat} from 'lit-html/directives/repeat';
import {Toolbar} from './toolbar';

const {g, n} = getNamespace('file-upload');

/**
 * @typedef {Object} UploadedFile
 * @property {string} name - filename
 * @property {string} data - base64 encoded data url
 */

/**
 * @param {{name: string}} a
 * @param {{name: string}} b
 * @return {number}
 */
export const fileSortCompare = ({name: a}, {name: b}) => (a > b ? 1 : -1);

/**
 * @param {File} file
 * @return {UploadedFile}
 */
export const attachDataUrl = file => {
  const {promise, resolve, reject} = new Deferred();
  const reader = new FileReader();
  reader.onload = e => {
    resolve({
      name: file.name,
      data: e.target.result,
    });
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
  return promise;
};

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
    <div class="${g('text-button')}">
      Add Files
    </div>
    <input type="file" hidden multiple @change="${dispatchUploadFiles}" />
  </div>
`;

/**
 * Remove given index from files array.
 * @param {!Array<UploadedFile>} files
 * @param {number} index
 */
export function removeUploadedFile(files, index) {
  files.splice(index, 1);
  return files;
}

/**
 * Creates a RegExp for a loosely-delimited (e.g. matching quotes are not checked)
 * attribute value like: `=value>`, `=value`, `="value"`, `='value'`
 * @param {*} value
 * @return {RegExp} Matching groups (1, 2) and start/end delimiters, including starting
 * equal sign `=` and possible wrapping chars (whitespace, `'`, `"`, '>').
 */
const delimitedAttrValueRe = memoize(
  value => new RegExp(`(=['"]?)${value}([\s'">])`, 'g')
);

/**
 * Encodes an uploaded filename like `my file.jpg` into a safe, host-relative url as
 * `/my%20file.jpg`.
 * @param {string} name
 * @return {string}
 */
export const readableFileUrl = name => `/${encodeURI(name)}`;

/**
 *
 * @param {string} docStr
 * @param {Array<UploadedFile>} files
 */
export function replaceFileRefs(docStr, files) {
  for (const {name, data} of files) {
    docStr = docStr.replace(
      delimitedAttrValueRe(readableFileUrl(name)),
      `$1${data}$2`
    );
  }
  return docStr;
}

/**
 * Read new files to data url and add them to existing files array.
 * @param {!Array} source
 * @param {!files} files
 * @return {!Promise<Array<UploadedFile>>}
 */
export const concatAttachBlobUrl = async (source, files) => {
  const filePromises = Array.from(files).map(f => attachDataUrl(f));
  const newFiles = await Promise.all(filePromises);
  return source.concat(newFiles).sort(fileSortCompare);
};
