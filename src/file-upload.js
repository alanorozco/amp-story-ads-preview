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
import {classMap} from 'lit-html/directives/class-map';
import {getNamespace} from '../lib/namespace';
import {html} from 'lit-html';

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
 * Gets files from an Event.dataTransfer object (typically from a drop.)
 * @param {DataTransfer} dataTransfer
 * @return {IArrayLike<File>}
 */
export function filesFromDataTransfer({files, items}) {
  if (files && files.length) {
    return files;
  }
  if (items && items.length) {
    const files = [];
    for (const item of items) {
      if (item.kind == 'file') {
        files.push(item.getAsFile());
      }
    }
    return files;
  }
  return [];
}
