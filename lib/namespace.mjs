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

export const globalPrefix = 'amp-sap-';

/**
 * @param {string} name
 * @return {!Object} namespace
 * @return {string} namespace.id Unique id for component.
 * @return {function(string):string} namespace.n Namespaces an id or class.
 * @return {function(string):string} namespace.s Namespaces a selector.
 */
export const getNamespace = componentName =>
  namespace(globalPrefix + componentName);

/**
 * @param {string} id
 * @return {!Object} namespace
 * @return {string} namespace.id Unique id for component.
 * @return {function(string):string} namespace.n Namespaces an id or class.
 * @return {function(string):string} namespace.s Namespaces a selector.
 */
function namespace(id) {
  const n = name => `${id}-${name}`;
  const s = selector =>
    selector.replace(
      idOrClassInSelectorRe,
      match => match[0] + n(match.slice(1))
    );
  return {id, n, s};
}

const idOrClassInSelectorRe = /[#.][^\s#.%[:]+/g;
