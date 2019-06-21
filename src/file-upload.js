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